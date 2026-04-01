import { render } from 'solid-js/web';

import Notification from './Notification';

const wrapper = document.getElementById('app');

if (!wrapper) {
	throw new Error('Wrapper div not found');
}

render(() => <Notification />, wrapper);
