export const getMenuItems = (config={}) => {
	const menuOptions = [
		{
			label: 'Create Online Game',
			id: 'online',
			class: 'expandable disabled',
			expandable: true,
			subItems: [
				{
					label: 'Game Name:',
					input: true,
					type: 'text',
					class: 'double-item',
					id: '',
					name: 'roomName',
					setting: config.host?.gameName||'Dune Game',
				},
				{
					label: 'Password:',
					input: true,
					type: 'text',
					class: 'double-item',
					id: '',
					name: 'roomPassword',
					setting: config.host?.gameName||'',
				},
				{
					label: 'Create Game',
					button: true,
					type: '',
					class: 'single-item',
					subClass: 'launch',
					id: 'launch-online',
					name: '',
					setting: '',
				},
			]
		},
		{
			label: 'Host Local Game',
			id: 'host',
			class: 'expandable',
			expandable: true,
			subItems: [
				{
					label: 'Game Name:',
					input: true,
					type: 'text',
					class: 'double-item',
					id: '',
					name: 'gameName',
					setting: config.host?.gameName||'Dune Game',
				},
				{
					label: 'Port:',
					input: true,
					type: 'text',
					class: 'double-item',
					id: '',
					name: 'hostPort',
					setting: config.host?.hostPort||'8080',
				},
				{
					label: 'Create Game',
					button: true,
					type: '',
					class: 'single-item',
					subClass: 'launch',
					id: 'launch-host',
					name: '',
					setting: '',
				},
			],
		},
		{
			label: 'Join Game',
			id: 'join',
			class: 'expandable',
			expandable: true,
			subItems: [
				{
					label: 'IP Address:',
					input: true,
					type: 'text',
					class: 'double-item',
					id: '',
					name: 'joinIp',
					setting: config.join?.lastIp||'127.0.0.1',
				},
				{
					label: 'Port',
					input: true,
					type: 'text',
					class: 'double-item',
					id: '',
					name: 'joinPort',
					setting: config.join?.lastPort||'8080',
				},
				{
					label: 'Password:',
					input: true,
					type: 'text',
					class: 'double-item',
					id: '',
					name: 'joinPassword',
					setting: config.host?.lastPassword||'',
				},
				{
					label: 'Join Game',
					button: true,
					class: 'single-item',
					subClass: 'launch',
					id: 'launch-join',
				},
			]
		},
		{
			label: 'Settings',
			id: 'settings',
			class: 'expandable',
			expandable: true,
			subItems: [
				{
					label: 'Player Name:',
					input: true,
					type: 'text',
					class: 'double-item',
					id: '',
					name: 'playerName',
					setting: config.player?.playerName||'',
				},
				{
					label: 'Player ID:',
					input: true,
					type: 'text',
					class: 'double-item',
					subClass: 'disabled',
					id: '',
					name: 'playerId',
					setting: config.player?.id||'',
				},
			]
		},
		{
			label: 'Exit Game',
			id: 'quit',
			class: 'expandable',
			expandable: false,
			subItems: []
		},
	];
	return menuOptions;
}