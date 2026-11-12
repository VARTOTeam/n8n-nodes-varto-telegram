import type {
 ITriggerFunctions,
 ITriggerResponse,
 INodeType,
 INodeTypeDescription,
 IDataObject,
} from 'n8n-workflow';

import { NodeConnectionTypes, sleep, NodeApiError, NodeOperationError } from 'n8n-workflow';

const updateTypes = [
 'message',
 'edited_message',
 'channel_post',
 'edited_channel_post',
 'business_connection',
 'business_message',
 'edited_business_message',
 'deleted_business_messages',
 'message_reaction',
 'message_reaction_count',
 'inline_query',
 'chosen_inline_result',
 'callback_query',
 'shipping_query',
 'pre_checkout_query',
 'poll',
 'poll_answer',
 'my_chat_member',
 'chat_member',
 'chat_join_request',
 'chat_boost',
 'removed_chat_boost',
];

export class VartoTelegramPoll implements INodeType {
 description: INodeTypeDescription = {
  displayName: 'VARTO Telegram Poll',
  name: 'vartoTelegramPoll',
  icon: { light: 'file:telegram.svg', dark: 'file:telegram.dark.svg' },
  group: ['trigger'],
  version: 1,
  description: 'Receive Telegram updates using long polling',
  subtitle: 'Telegram Bot API · Long Polling',
  defaults: { name: 'VARTO Telegram Poll' },
  inputs: [],
  outputs: [NodeConnectionTypes.Main],
  credentials: [{ name: 'telegramApi', required: true }],
  properties: [
   {
    displayName: 'Update Types',
    name: 'updateTypes',
    type: 'multiOptions',
    options: updateTypes.map((type) => ({ name: type, value: type })),
    default: ['message', 'callback_query'],
    description: 'Telegram update types to receive',
   },
   {
    displayName: 'Long Polling Timeout',
    name: 'pollingTimeout',
    type: 'number',
    default: 30,
    typeOptions: { minValue: 1, maxValue: 50 },
    description: 'How long Telegram should wait for updates, in seconds',
   },
  ],
 };

 async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
  const credentials = await this.getCredentials('telegramApi');
  const token = credentials.accessToken as string;
  const selectedTypes = this.getNodeParameter('updateTypes', []) as string[];
  const pollingTimeout = this.getNodeParameter('pollingTimeout', 30) as number;

  const controller = new AbortController();
  let stopping = false;
  let offset = 0;

  const wait = async (milliseconds: number): Promise<void> => {
   try {
    await sleep(milliseconds, controller.signal);
   } catch (error) {
    if (!stopping) throw new NodeOperationError(this.getNode(), error instanceof Error ? error : String(error));
   }
  };

  const poll = async (): Promise<void> => {
   let retryDelay = 1000;

   while (!stopping) {
    try {
     const response = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://api.telegram.org/bot' + token + '/getUpdates',
      qs: {
       offset,
       timeout: pollingTimeout,
       limit: 100,
       allowed_updates: JSON.stringify(selectedTypes),
      },
      json: true,
      timeout: (pollingTimeout + 5) * 1000,
      ignoreHttpStatusErrors: true,
      abortSignal: controller.signal,
     }) as IDataObject;

     if (stopping) break;
     const errorCode = Number(response.error_code ?? 0);
     if (response.ok !== true) {
      if (errorCode === 429) {
       const parameters = response.parameters as IDataObject | undefined;
       const retryAfter = Number(parameters?.retry_after ?? 5);
       await wait(Math.max(retryAfter, 1) * 1000);
       continue;
      }
      if (errorCode >= 500 && errorCode <= 599) {
       await wait(retryDelay);
       retryDelay = Math.min(retryDelay * 2, 30000);
       continue;
      }

      let message = 'Telegram API request failed';
      let description = 'Check Telegram API response and node configuration.';

      if (errorCode === 401 || errorCode === 403) {
       message = 'Telegram authentication failed';
       description = 'Check the bot token and its permissions.';
      } else if (errorCode === 409) {
       message = 'Telegram polling conflict (409)';
       description = 'Another poller or an active webhook is using this bot.';
      } else if (errorCode === 400) {
       message = 'Telegram rejected the getUpdates request (400)';
       description = 'Check update types and polling parameters.';
      }
      this.emitError(
       new NodeApiError(
        this.getNode(),
        { message },
        {
         message,
         description,
         httpCode: String(errorCode || 500),
        },
       ),
      );
      break;
     }

     retryDelay = 1000;
     const updates = response.result;

     if (!Array.isArray(updates)) {
      this.emitError(
       new NodeApiError(
        this.getNode(),
        { message: 'Invalid Telegram API response' },
        {
         message: 'Invalid Telegram API response',
         description: 'The result field is not an array.',
        },
       ),
      );
      break;
     }
     for (const update of updates as IDataObject[]) {
      if (stopping) break;
      this.emit([[{ json: update }]]);

      const updateId = Number(update.update_id);
      if (Number.isFinite(updateId)) {
       offset = Math.max(offset, updateId + 1);
      }
     }
    } catch {
     if (stopping || controller.signal.aborted) break;
     await wait(retryDelay);
     retryDelay = Math.min(retryDelay * 2, 30000);
    }
   }
  };

  const pollPromise = poll();

  return {
   closeFunction: async () => {
    stopping = true;
    controller.abort();
    await pollPromise;
   },
  };
 }
}
