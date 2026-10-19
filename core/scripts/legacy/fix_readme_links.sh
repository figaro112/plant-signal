# fix_readme_links.sh
find docs -type f -name "*.md" -print0 | xargs -0 sed -i '' \
  -e 's#\(\.\./\)README\.md#\1#g' \
  -e 's#\(\.\./\.\./\)README\.md#\1#g' \
  -e 's#\(\.\./\.\./\.\./\)README\.md#\1#g' \
  -e 's#\(\./\)README\.md#\1#g'
