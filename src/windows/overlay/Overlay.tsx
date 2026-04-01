import { onMount } from 'solid-js';

import { applyTheme, initSettings } from '../../shared/stores/settings';
import { TranslatorOverlay } from '../../widget/overlay/TranslatorOverlay';

import '../../assets/style/index.css';

const Overlay = () => {


	onMount(() => {
		document.body.style.background = 'transparent';
		initSettings()
			.then(settings => {
				applyTheme(settings.theme);
				
			})
			.catch(console.error);
	});



	return <TranslatorOverlay />;
}

export default Overlay;
