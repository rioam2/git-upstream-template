#! /bin/bash

if [ "$#" -ne 1 ]; then
    echo "Initialize.sh should be run before you make your first commit..."
    echo "Usage: ./initialize.sh <your-package-name>"
    exit 255
fi

echo Applying package name "$1":
pushd "$(dirname $0)" &> /dev/null
base_name="starter-npm-package-typescript"
files_to_process=( $(grep -Rl --exclude="initialize.sh" --exclude-dir={node_modules,.git} "$base_name" .) )

for i in "${files_to_process[@]}"
do
    echo + updated file "$i"
    sed -i -e "s/$base_name/$1/g" "$i"
done

popd &> /dev/null
rm -- "$0"

# Install dependencies
yarn

# Commit new package name
git add .
git commit -m "Initialized new package from template"

