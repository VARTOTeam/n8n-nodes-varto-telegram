# VARTO Telegram Polling

An n8n community node for receiving Telegram Bot API updates using long polling (getUpdates).

Unlike webhook-based triggers, it requires no public HTTPS endpoint, inbound ports, or webhook registration. Only outbound access to api.telegram.org is needed.

## Features

- Telegram Bot API long polling.
- No webhook configuration.
- Configurable Telegram update types.
- Automatic retries for rate limits, server errors, and network failures.
- Graceful shutdown.
- Bot token stored in n8n credentials.

## Installation

Install the community package n8n-nodes-varto-telegram using the n8n community nodes installation guide:
https://docs.n8n.io/integrations/community-nodes/installation/

## Credentials

1. Create a Telegram bot using @BotFather: https://t.me/BotFather
2. Copy the bot token.
3. In n8n, create credentials named VARTO Telegram API.
4. Paste the token into the Bot Token field and save.

The credential connection test uses Telegram getMe.

## Usage

1. Add VARTO Telegram Polling to your workflow.
2. Select your VARTO Telegram API credentials.
3. Choose the Telegram update types you want to receive.
4. Activate the workflow.

The node receives updates through Telegram getUpdates long polling.

## Important notes

- Only one active getUpdates poller should use a bot token at a time.
- A second poller using the same token may cause Telegram error 409.
- Temporary network errors, rate limits (429), and server errors (5xx) are retried.
- Emitting an update does not guarantee that the downstream n8n workflow has completed successfully. Exactly-once execution is not guaranteed.

## Supported update types

- message
- edited_message
- channel_post
- edited_channel_post
- business_connection
- business_message
- edited_business_message
- deleted_business_messages
- message_reaction
- message_reaction_count
- inline_query
- chosen_inline_result
- callback_query
- shipping_query
- pre_checkout_query
- poll
- poll_answer
- my_chat_member
- chat_member
- chat_join_request
- chat_boost
- removed_chat_boost

For details, see the official [Telegram Bot API](https://core.telegram.org/bots/api#update).

## Requirements

- n8n with community node support.
- Outbound HTTPS access to api.telegram.org.
- A Telegram bot token.

## Development

Run the following commands in the project directory:

- npm install
- npm run build
- npm run lint

## License

See the license declared in package.json.
