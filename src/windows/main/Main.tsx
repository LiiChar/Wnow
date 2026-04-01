import { onMount } from "solid-js";

import { Router } from '../../app/router/Router';
import { applyTheme, initSettings } from "../../shared/stores/settings";

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
		<Router />
	);
}

export default Main;