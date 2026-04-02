import { onMount } from "solid-js";

import { Router } from '../../app/router/Router';
import { LocaleProvider } from '../../shared/lib/locale.tsx';
import { applyTheme, initSettings, settingsStore } from "../../shared/stores/settings";

import '../../assets/style/index.css';

const Main = () => {
	onMount(() => {
		initSettings()
			.then(settings => {
				applyTheme(settings.theme);
			})
			.catch(console.error);
	});

	return (
		<LocaleProvider initialLocale={settingsStore.ui_locale}>
			<Router />
		</LocaleProvider>
	);
}

export default Main;