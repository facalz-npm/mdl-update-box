<div align="center">
    <br />
    <img src="https://raw.githubusercontent.com/facalz/assets/main/facalz-npm/mdl-update-box/image.png" alt="image">
    <h3>📺 mdl-update-box</h3>
    <p>Webscrap to show your last updates in MyDramaList.</p>
</div>

---

## Installation

```sh-session
npm install mdl-update-box
yarn add mdl-update-box
```

## Prep work

1. Create a new public GitHub Gist. (<https://gist.github.com/>)
2. Create a token with the `gist` scope and copy it. (<https://github.com/settings/tokens/new>)

## Example usage

```js
const main = require('mdl-update-box');

const {
    GIST_ID: gistId,
    GH_TOKEN: githubToken,
    USER: user
} = process.env;

main(user, gistId, githubToken);
```

## Environment secrets

- **GIST_ID:** The ID portion from your gist url: https://gist.github.com/facalz/ `c7ecf280a4fc2214a85cef64896e020f`
- **GH_TOKEN:** The GitHub token generated above.
- **USER:** Your user in [MyDramaList](https://mydramalist.com).