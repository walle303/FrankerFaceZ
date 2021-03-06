var FFZ = window.FrankerFaceZ,
	utils = require('../utils'),

	route_helper;


// --------------------
// Settings
// --------------------

FFZ.settings_info.portrait_mode = {
	type: "select",
	options: {
		0: "Disabled",
		1: "Automatic (Use Window Aspect Ratio)",
		2: "Always On",
		3: "Automatic (Video Below)",
		4: "Always On (Video Below)"
	},

	value: 0,
	process_value: utils.process_int(0, 0, 1),

	category: "Appearance",
	no_mobile: true,
	no_bttv: true,

	name: "Portrait Mode (Chat Below Video)",
	help: "Display the right sidebar beneath (or above) the video player for viewing in portrait orientations.",

	on_update: function(val) {
		if ( this.has_bttv )
			return;

		var Layout = utils.ember_lookup('service:layout');
		if ( ! Layout )
			return;

		Layout.set('rawPortraitMode', val);
		this._fix_menu_position();
	}
}

FFZ.settings_info.portrait_warning = {
	value: false,
	visible: false
}


FFZ.settings_info.swap_sidebars = {
	type: "boolean",
	value: false,

	category: "Sidebar",
	no_mobile: true,
	no_bttv: true,

	name: "Swap Sidebar Positions",
	help: "Swap the positions of the left and right sidebars, placing chat on the left.",

	on_update: function(val) {
			if ( this.has_bttv )
				return;

			document.body.classList.toggle("ffz-sidebar-swap", val);
			this._fix_menu_position();
		}
	};


FFZ.settings_info.flip_dashboard = {
	type: "boolean",
	value: false,

	category: "Dashboard",
	no_mobile: true,
	no_bttv: true,

	name: "Swap Column Positions",
	help: "Swap the positions of the left and right columns of the dashboard.",

	on_update: function(val) {
			if ( this.has_bttv )
				return;

			document.body.classList.toggle("ffz-flip-dashboard", val);
		}
	};


FFZ.settings_info.right_column_width = {
	type: "button",
	value: 340,

	category: "Appearance",
	no_mobile: true,
	no_bttv: true,

	name: "Right Sidebar Width",
	help: "Set the width of the right sidebar for chat.",

	method: function() {
		var f = this,
			old_val = this.settings.right_column_width || 340;

		utils.prompt("Right Sidebar Width", "Please enter a new width for the right sidebar, in pixels.</p><p><b>Minimum:</b> 250<br><b>Default:</b> 340", old_val, function(new_val) {
			if ( new_val === null || new_val === undefined )
				return;

			var width = parseInt(new_val);
			if ( ! width || Number.isNaN(width) || ! Number.isFinite(width) )
				width = 340;

			f.settings.set('right_column_width', Math.max(250, width));
		});
	},

	on_update: function(val) {
		if ( this.has_bttv )
			return;

		var Layout = utils.ember_lookup('service:layout');
		if ( ! Layout )
			return;

		Layout.set('rightColumnWidth', val);
		Ember.propertyDidChange(Layout, 'contentWidth');
	}
};


FFZ.settings_info.minimize_navigation = {
	type: "boolean",
	value: false,

	category: "Sidebar",
	no_mobile: true,
	no_bttv: true,

	name: "Minimize Navigation",
	help: "Slide the navigation bar mostly out of view when it's not being used.",

	on_update: function(val) {
		if ( this.has_bttv )
			return;

		var Layout = utils.ember_lookup('service:layout');
		if ( ! Layout )
			return;

		utils.toggle_cls('ffz-sidebar-minimize')(val);
		Layout.set('ffzMinimizeNavigation', val);
		//Ember.propertyDidChange(Layout, 'contentWidth');
	}
}


// --------------------
// Initialization
// --------------------

FFZ.prototype.setup_layout = function() {
	if ( this.has_bttv )
		return;

	utils.toggle_cls("ffz-sidebar-swap")(this.settings.swap_sidebars);
	utils.toggle_cls('ffz-sidebar-minimize')(this.settings.minimize_navigation);

	this.log("Creating layout style element.");
	var s = this._layout_style = document.createElement('style');
	s.id = 'ffz-layout-css';
	document.head.appendChild(s);

	try {
		route_helper = window.require("web-client/utilities/route-matcher");
	} catch(err) {
		this.error("Unable to require the route-matcher utility.", err);
	}

	var Layout = utils.ember_lookup('service:layout'),
		f = this;

	if ( ! Layout )
		return this.log("Unable to locate the Ember service:layout");

	this.log("Hooking the Ember service:layout");

	Layout.reopen({
		rightColumnWidth: 340,
		rawPortraitMode: 0,

		portraitVideoBelow: false,

		channelCoverHeight: function() {
			var setting = f.settings.hide_channel_banner,
				banner_hidden = setting === 1 ? f.settings.channel_bar_bottom : setting > 0;

			return ( banner_hidden || ! route_helper || route_helper.routeMatches && !route_helper.routeMatches(this.get('globals.currentPath'), route_helper.ROUTES.CHANNEL_ANY) ) ?
				0 : 380;

		}.property("globals.currentPath"),

		portraitMode: function() {
			var raw = this.get("rawPortraitMode");
			this.set('portraitVideoBelow', raw === 3 || raw === 4);

			if ( raw === 0 )
				return false;
			if ( raw === 2 || raw === 4 )
				return true;

			// Not sure if I should be adding some other value to offset the ratio. What feels best?
			var ratio = this.get("windowWidth") / (this.get("windowHeight") + 120 + 60);
			return ratio < 1;

		}.property("rawPortraitMode", "windowHeight", "windowWidth"),

		isTooSmallForRightColumn: function() {
			if ( ! f.has_bttv && this.get('portraitMode') ) {
				var size = this.get('fullSizePlayerDimensions'),
					extra = this.get('ffzExtraHeight'),
					height = size.height + extra;

				// Make sure we have at least a bit of room for the chat.
				return this.get("windowHeight") < height;

			} else
				return this.get("windowWidth") < (1090 - this.get('rightColumnWidth'))

		}.property("ffzExtraHeight", "windowWidth", "rightColumnWidth", "fullSizePlayerDimensions", "windowHeight"),

		contentWidth: function() {
			var left_width = this.get('ffzMinimizeNavigation') ? 10 : this.get("isLeftColumnClosed") ? 50 : 240,
				right_width = ! f.has_bttv && this.get('portraitMode') ? 0 : this.get("isRightColumnClosed") ? 0 : this.get("rightColumnWidth");

			return this.get("windowWidth") - left_width - right_width - 60;

		}.property("windowWidth", 'ffzMinimizeNavigation', "portraitMode", "isRightColumnClosed", "isLeftColumnClosed", "rightColumnWidth"),

		ffzExtraHeight: function() {
			return (f.settings.channel_bar_collapse ? 10 : 60) + 15 +
				(f.settings.channel_title_top === 2 ? 20 : f.settings.channel_title_top > 0 ? 55 : 0) +
				(f.settings.channel_title_top ? 70 : 80);
		}.property(""),

		fullSizePlayerDimensions: function() {
			var h = this.get('windowHeight'),
				c = this.get('PLAYER_CONTROLS_HEIGHT'),
				r = this.get('contentWidth'),

				extra_height = this.get('ffzExtraHeight'),
				extra_theater_height = 120 + (f.settings.channel_bar_collapse ? 10 : 60) + 40,

				i = Math.round(9 * r / 16) + c,
				d = h - extra_height,
				e = h - extra_theater_height,

				l = Math.floor(r),
				o = Math.floor(Math.min(i, d)),
				s = Math.floor(Math.min(i, e));

			return {
				width: l,
				height: o,
				targetHeight: s
			}

		}.property("ffzExtraHeight", "contentWidth", "windowHeight", "portraitMode", "PLAYER_CONTROLS_HEIGHT"),

		playerStyle: function() {
			var size = this.get('fullSizePlayerDimensions');

			return '<style>' +
				'.dynamic-player, .dynamic-player object, .dynamic-player video {' +
					'width:' + size.width + 'px !important;' +
					'height:' + size.height + 'px !important}' +
				'.dynamic-target-player, .dynamic-target-player object, .dynamic-target-player video {' +
					'width:' + size.width + 'px !important;' +
					'height:' + size.targetHeight + 'px !important}' +
				'.dynamic-player .player object,' +
				'.dynamic-player .player video {' +
					'width: 100% !important;' +
					'height: 100% !important}';

		}.property("fullSizePlayerDimensions"),

		ffzPortraitWarning: function() {
			var t = this;
			// Delay this, in case we're just resizing the window.
			setTimeout(function() {
				if ( ! f.settings.portrait_mode || f._portrait_warning || f.settings.portrait_warning || document.body.getAttribute('data-current-path').indexOf('user.') !== 0 || ! t.get('isTooSmallForRightColumn') )
					return;

				f._portrait_warning = true;
				f.show_message('Twitch\'s Chat Sidebar has been hidden as a result of FrankerFaceZ\'s Portrait Mode because the window is too wide.<br><br>Please <a href="#" onclick="ffz.settings.set(\'portrait_mode\',0);jQuery(this).parents(\'.ffz-noty\').remove();ffz._portrait_warning = false;return false">disable Portrait Mode</a> or make your window narrower.<br><br><a href="#" onclick="ffz.settings.set(\'portrait_warning\',true);jQuery(this).parents(\'.ffz-noty\').remove();return false">Do not show this message again</a>');
			}, 50);

		}.observes("isTooSmallForRightColumn"),

		ffzUpdateCss: function() {
			var window_height = this.get('windowHeight'),
				window_width = this.get('windowWidth'),
				width = this.get('rightColumnWidth'),
				out = '';

			if ( ! f.has_bttv ) {
				if ( ! this.get('isRightColumnClosed') ) {
					if ( this.get('portraitMode') ) {
						var size = this.get('fullSizePlayerDimensions'),
							video_below = this.get('portraitVideoBelow'),

							video_height = size.height + this.get('ffzExtraHeight'),
							chat_height = window_height - video_height,

							video_top = video_below ? chat_height : 0,
							video_bottom = window_height - (video_top + video_height),
							chat_top = video_below ? 0 : video_height,

							theatre_video_height = Math.floor(Math.max(window_height * 0.1, Math.min(window_height - 300, 9 * window_width / 16))),
							theatre_chat_height = window_height - theatre_video_height,

							theatre_video_top = video_below ? theatre_chat_height : 0,
							theatre_video_bottom = window_height - (theatre_video_top + theatre_video_height),
							theatre_chat_top = video_below ? 0 : theatre_video_height;

						out += '.player-mini {' +
								'bottom: ' + (10 + video_bottom) + 'px}' +
							'.ffz-channel-bar-bottom .player-mini {' +
								'bottom: ' + (60 + video_bottom) + 'px}' +
							'.ffz-channel-bar-bottom.ffz-minimal-channel-bar .player-mini {' +
								'bottom: ' + (20 + video_bottom) + 'px}' +
							'.ffz-sidebar-swap .player-mini {' +
								'left: 10px !important}' +
							'body[data-current-path^="user."] #left_col .warp { min-height: inherit }' +
							'body[data-current-path^="user."] #left_col { overflow: hidden }' +
							'body[data-current-path^="user."] #left_col .warp,' +
							'body[data-current-path^="user."] #left_col,' +
							'body[data-current-path^="user."] .searchPanel--slide,' +
							'body[data-current-path^="user."]:not(.ffz-sidebar-swap) #main_col{' +
								'margin-right:0 !important;' +
								'top:' + video_top + 'px;' +
								'height:' + video_height + 'px}' +
							'body[data-current-path^="user."].ffz-sidebar-swap #main_col{' +
								'margin-left:0 !important;' +
								'top:' + video_top + 'px;' +
								'height:' + video_height + 'px}' +
							'body[data-current-path^="user."] #right_col{' +
								'width:100%;' +
								'top:' + chat_top + 'px;' +
								'height:' + chat_height + 'px}' +
							'body[data-current-path^="user."] .app-main.theatre #left_col .warp,' +
							'body[data-current-path^="user."] .app-main.theatre #left_col,' +
							'body[data-current-path^="user."] .app-main.theatre #player,' +
							'body[data-current-path^="user."] .app-main.theatre #main_col{' +
								'top:' + theatre_video_top + 'px;' +
								'height:' + theatre_video_height + 'px !important}' +
							'body[data-current-path^="user."] .app-main.theatre #right_col{' +
								'top:' + theatre_chat_top + 'px;' +
								'height:' + theatre_chat_height + 'px}' +
							'.app-main.theatre #player {' +
								'right: 0 !important}' +
							'body.ffz-minimal-channel-bar:not(.ffz-channel-bar-bottom) .cn-bar-fixed {' +
								'top: ' + (video_top - 40) + 'px}' +
							'body.ffz-minimal-channel-bar:not(.ffz-channel-bar-bottom) .cn-bar-fixed:hover,' +
							'body:not(.ffz-channel-bar-bottom) .cn-bar-fixed {' +
								'top: ' + video_top + 'px}' +
							'.ffz-minimal-channel-bar.ffz-channel-bar-bottom .cn-bar {' +
								'bottom: ' + (video_bottom - 40) + 'px}' +
							'.ffz-minimal-channel-bar.ffz-channel-bar-bottom .cn-bar:hover,' +
							'.ffz-channel-bar-bottom .cn-bar {' +
								'bottom: ' + video_bottom + 'px}' +
							'body:not(.ffz-sidebar-swap) .cn-bar-fixed { right: 0 !important }' +
							'body.ffz-sidebar-swap .cn-bar-fixed { left: 0 !important }' +
							'.ffz-theater-stats .app-main.theatre .cn-hosting--bottom,' +
							'.ffz-theater-stats .app-main.theatre .cn-metabar__more {' +
								'max-width: calc(100% - 350px);' +
								'bottom: ' + (theatre_video_bottom + 55) + 'px !important}' +
							'.ffz-theater-stats:not(.ffz-theatre-conversations):not(.ffz-top-conversations) .app-main.theatre .cn-metabar__more {' +
								'bottom: ' + (theatre_video_bottom + 90) + 'px !important}';

					} else {
						out += '.ffz-sidebar-swap .player-mini{left:' + (width + 10) + 'px !important}' +
							'#main_col.expandRight #right_close{left: none !important}' +
							'#right_col{width:' + width + 'px}' +
							'body:not(.ffz-sidebar-swap) #main_col:not(.expandRight){' +
								'margin-right:' + width + 'px}' +
							'body.ffz-sidebar-swap .theatre #main_col:not(.expandRight),' +
							'body.ffz-sidebar-swap #main_col:not(.expandRight){' +
								'margin-left:' + width + 'px}' +
							'body:not(.ffz-sidebar-swap) .app-main.theatre #main_col:not(.expandRight) #player {' +
								'right: ' + width + 'px !important}' +
							'body.ffz-sidebar-swap .app-main.theatre #main_col:not(.expandRight) #player {' +
								'right: 0 !important;' +
								'left:' + width + 'px !important}' +
							'body:not(.ffz-sidebar-swap) #main_col:not(.expandRight) .cn-bar-fixed {' +
								'right: ' + width + 'px}' +
							'body.ffz-sidebar-swap .theatre .cn-hosting--bottom,' +
							'body.ffz-sidebar-swap .theatre .cn-metabar__more {' +
								'left: ' + (width + 10) + 'px !important}' +
							'body.ffz-sidebar-swap #main_col:not(.expandRight) .cn-bar-fixed {' +
								'left: ' + width + 'px !important}' +
							'.ffz-theater-stats .app-main.theatre .cn-hosting--bottom,' +
							'.ffz-theater-stats .app-main.theatre .cn-metabar__more {' +
								'max-width: calc(100% - ' + (width + 350) + 'px)}';
					}
				}

				f._layout_style.innerHTML = out;
			}

		}.observes("ffzExtraHeight", "isRightColumnClosed", "fullSizePlayerDimensions", "rightColumnWidth", "portraitMode", "windowHeight", "windowWidth"),

		ffzUpdatePlayerStyle: function() {
			Ember.propertyDidChange(Layout, 'playerStyle');
		}.observes('windowHeight', 'windowWidth'),

		ffzUpdatePortraitCSS: function() {
			var portrait = this.get("portraitMode");
			document.body.classList.toggle("ffz-portrait", ! f.has_bttv && portrait);

		}.observes("portraitMode"),

		ffzFixTabs: function() {
			if ( f.settings.group_tabs && f._chatv && f._chatv._ffz_tabs ) {
				setTimeout(function() {
					var cr = f._chatv && f._chatv.$('.chat-room');
					cr && cr.css && cr.css('top', f._chatv._ffz_tabs.offsetHeight + "px");
				},0);
			}
		}.observes("isRightColumnClosed", "rightColumnWidth", "portraitMode", "fullSizePlayerDimensions")
	});


	// Force the layout to update.
	Layout.set('rightColumnWidth', this.settings.right_column_width);
	Layout.set('rawPortraitMode', this.settings.portrait_mode);
	Layout.set('ffzMinimizeNavigation', this.settings.minimize_navigation);

	// Force re-calculation of everything.
	Ember.propertyDidChange(Layout, 'windowWidth');
	Ember.propertyDidChange(Layout, 'windowHeight');
	Ember.propertyDidChange(Layout, 'ffzExtraHeight');
	Ember.propertyDidChange(Layout, 'isTooSmallForRightColumn');
	Ember.propertyDidChange(Layout, 'fullSizePlayerDimensions');
	Layout.ffzUpdatePortraitCSS();
}