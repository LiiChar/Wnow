import { onMount } from "solid-js";
import { initSettings, applyTheme } from "../../shared/stores/settings";
import { Router } from '../../app/router/Router';
import '../../assets/style/index.css';

function Main() {
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