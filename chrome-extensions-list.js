require('fs.promises');

const fs = require('fs');
const fsp = fs.promises;
const { Html5Entities } = require('html-entities');
const https = require('https');
const ora = require('ora');
const path = require('path');

const args = process.argv.slice(2);
const optionsMap = {
	'--print': 'print',
	'--help': 'help'
};
const options = Object.entries(optionsMap).reduce((options, [optionArg, option]) => (
	Object.assign(options, { [option]: args.includes(optionArg) })
), {});
let [profileRelPath, htmlPath] = args.filter(arg => !Object.keys(optionsMap).includes(arg));

if (options.help || !profileRelPath) {
	console.log(`
Exports a list of installed Chrome extensions from a profile (defaults to program location) to HTML file.

Make sure chrome-extensions-list has read and write access to these locations.

Usage:
    chrome-extensions-list --help
    chrome-extensions-list --print <path-to-profile>
    chrome-extensions-list <path-to-profile-dir> [path-to-html-file]
`);
	process.exit(1);
}

let profilePath = path.resolve(profileRelPath);
let extsPath = path.join(profilePath, 'Extensions');

if (!fs.existsSync(extsPath)) {
	profilePath = path.resolve(profileRelPath, 'Default');
	extsPath = path.join(profilePath, 'Extensions');

	if (!fs.existsSync(extsPath)) {
		console.log('Extensions path not found');
		process.exit(1);
	}
}

(async () => {
	const spinner = ora({ text: 'Exporting', spinner: 'line' }).start();

	try {
		await init();
	} catch (err) {
		console.warn(err);
	} finally {
		spinner.stop();
	}
})();

async function init() {
	const extSettings = {};

	try {
		const preferencesPath = path.join(profilePath, 'Secure Preferences');
		const preferences = JSON.parse(await fsp.readFile(preferencesPath, { encoding: 'utf8' }));
		Object.assign(extSettings, preferences.extensions.settings);
	} catch (_err) {}

	const exts = [];
	const extFilenames = (await fsp.readdir(extsPath))
	.filter(filename => /^[a-z]{32}$/.test(filename));

	for (const extId of extFilenames) {
		let extName;
		let extVer;

		try {
			const extPath = path.join(extsPath, extId);
			const [highestVerDirname] = (await fsp.readdir(extPath))
			.filter(highestVerDirname => /^\d[\d\.]*(?:_\d+|)$/.test(highestVerDirname))
			.sort((a,b) => a.localeCompare(b, 'en-US', { numeric: true, sensitivity: 'base' }))
			.reverse();
 
			[, extVer] = highestVerDirname.match(/^(\d[\d\.]*)/) || [];
			const manifestPath = path.join(extPath, highestVerDirname, 'manifest.json');
			const manifest = JSON.parse(await fsp.readFile(manifestPath, { encoding: 'utf8' }));
			extName = !/^__MSG_/.test(manifest.name) ? manifest.name : extSettings[extId].manifest.name;
		} catch (_err) {}

		const disabled = (extSettings[extId] && extSettings[extId].state === 0);

		let unavailable;

		try {
			unavailable = await isExtUnavailable(extId);
			await delay(50);
		} catch (_err) {}

		const extNameHtml = Html5Entities.encode(extName || extId);

		exts.push({
			disabled,
			name: extName,
			html: `<p><a ${unavailable === true ? 'class="unavailable" ' : ''}href="https://chrome.google.com/webstore/detail/${extId}">${extNameHtml} ${extVer || ''}</a></p>`
		});
	}

	exts.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'en-US'));
	const enabledExtsHtml = exts.filter(({ disabled }) => !disabled).map(({ html }) => html).join('\n');
	const disabledExtsHtml = exts.filter(({ disabled }) => disabled).map(({ html }) => html).join('\n');

	const html = `<html>
<head>
<title>Chrome extensions</title>
<style>
body { color: #333; }
a.unavailable { opacity: 0.75; text-decoration: line-through; }
</style>
</head>
<body>
<section>
<h2>Enabled extensions</h2>
${enabledExtsHtml}
</section>
<section>
<h2>Disabled extensions</h2>
${disabledExtsHtml}
</section>
</body>
</html>`;

	if (options.print) {
		console.log(html);
	} else {
		if (!htmlPath) {
			const timestamp = new Date().toISOString().slice(0,-1).replace(/(\D)/g, '-');
			const appDirPath = process.pkg ? path.dirname(process.execPath) : __dirname;
			htmlPath = path.join(appDirPath, `chrome-extensions-${timestamp}.html`);
		}

		await fsp.writeFile(htmlPath, html, { encoding: 'utf8' });		
	}
}

function isExtUnavailable(extId) {
	const extUrlRegexp = /^https:\/\/chrome\.google\.com\/webstore\/detail\/.+\/[a-z]{32}$/;
	const options = {
		host: 'chrome.google.com',
		port: 443,
		path: `/webstore/detail/${extId}`,
		method: 'HEAD'
	};

	return new Promise((resolve, reject) => {
		https.request(options, ({ statusCode, headers }) => {
			const isAvailable = statusCode === 301 && extUrlRegexp.test(headers.location);
			const isUnavailable = statusCode === 404;

			if (isAvailable || isUnavailable) {
				resolve(isUnavailable);
			} else {
				reject();
			}
		})
		.on('error', () => reject())
		.on('timeout', () => {
			req.abort();
			reject();
		})
		.setTimeout(5000)
		.end();
	});
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
