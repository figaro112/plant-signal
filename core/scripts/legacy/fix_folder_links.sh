# fix_folder_links.sh
# pouzitie
# bash fix_folder_links.sh

find docs -type f -name "*.md" -print0 | xargs -0 perl -i -pe '
  s#\]\((\./[^\)\.]+)\)#\]($1/)#g;       # ./NIECO   -> ./NIECO/
  s#\]\((\.\./[^\)\.]+)\)#\]($1/)#g;     # ../NIECO  -> ../NIECO/
  s#\]\((/en/[^\)\.]+)\)#\]($1/)#g;      # /en/...   -> /en/.../
  s#\]\((/sk/[^\)\.]+)\)#\]($1/)#g;      # /sk/...   -> /sk/.../
'
