# Sprout Planner

A personal planner for iPad: to-do list, day, week and month views, habits, lists (books, games, movies…), Apple Pencil drawing and stickers.
It's a plain web app (no build step). It installs to the Home Screen and works offline.

## Files
- `index.html`, `styles.css`, `app.js`: the app (`i18n.js` translations, `store.js` storage, `decor.js` Pencil + stickers, `stickers.js` starter pack)
- `sw.js`: offline cache. **Bump `CACHE` (e.g. `sprout-v3`) whenever you change a file**, or installed copies keep serving the old version.
- `manifest.webmanifest`, `icons/`: Home Screen install info

## Put it on the iPad
It needs to be served over HTTPS to install and work offline. Any free static host works:

- **Netlify Drop:** go to https://app.netlify.com/drop, drag this `planner` folder in, and open the URL it gives you.
- **GitHub Pages:** push this folder to a repo and enable Pages.

Then on the iPad, open the URL in **Safari**, tap **Share → Add to Home Screen**, and launch it from the icon.

## Your data
Everything is stored on the device (localStorage, plus IndexedDB for photos and drawings). Nothing is uploaded anywhere.
Use **··· → Export backup** now and then, and **Import backup** to restore or move to another device.
