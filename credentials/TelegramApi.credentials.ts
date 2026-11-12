import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class TelegramApi implements ICredentialType {
	name = 'telegramApi';
	displayName = 'VARTO Telegram API';
	icon = 'fa:send' as const;
	documentationUrl = 'https://core.telegram.org/bots/api';

	properties: INodeProperties[] = [
		{
			displayName: 'Bot Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Telegram Bot API token obtained from BotFather',
		},
	];

	test = {
		request: {
			method: 'GET' as const,
			url: 'https://api.telegram.org/bot{{$credentials.accessToken}}/getMe',
		},
	};
}
