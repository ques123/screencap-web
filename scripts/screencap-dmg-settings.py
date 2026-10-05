# dmgbuild settings for the Screencap installer (used by scripts/screencap-release.sh).
# dmgbuild writes the Finder layout (.DS_Store) itself, so it works on a locked or headless Mac,
# unlike Tauri's bundle_dmg.sh, which drives Finder with AppleScript.
# Defines: app (path to Screencap.app), background (1x PNG; a background@2x.png beside it is merged
# in for Retina), icon (volume .icns).
import os.path

app = defines["app"]
appname = os.path.basename(app)

format = "UDZO"
filesystem = "HFS+"
files = [app]
symlinks = {"Applications": "/Applications"}
icon = defines["icon"]
background = defines["background"]
# No hide_extensions: it writes com.apple.FinderInfo onto the app bundle, which fails strict
# signature checks ("resource fork, Finder information, or similar detritus not allowed").
show_status_bar = False
show_tab_view = False
show_toolbar = False
show_pathbar = False
show_sidebar = False
window_rect = ((200, 120), (660, 400))
default_view = "icon-view"
icon_size = 128
text_size = 13
icon_locations = {appname: (180, 140), "Applications": (480, 140)}
