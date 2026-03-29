import { onMount } from 'solid-js';
import '../../assets/style/index.css';

import { TranslatorOverlay } from '../../widget/overlay/TranslatorOverlay';
import { initSettings, applyTheme } from '../../shared/stores/settings';

function Overlay() {


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
