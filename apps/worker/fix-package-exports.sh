#!/bin/sh
# Fix package.json exports to point to dist instead of src

for pkg in packages/*/package.json; do
  echo "Fixing $pkg..."
  
  # Use sed to replace src/index.ts with dist/index.js
  sed -i 's|"./src/index.ts"|"./dist/index.js"|g' "$pkg"
  sed -i 's|"main": "./src/index.ts"|"main": "./dist/index.js"|g' "$pkg"
  sed -i 's|"types": "./src/index.ts"|"types": "./dist/index.d.ts"|g' "$pkg"
  
  # Also fix the import field in exports
  sed -i 's|"import": "./src/index.ts"|"import": "./dist/index.js"|g' "$pkg"
done

echo "Package.json files fixed!"
