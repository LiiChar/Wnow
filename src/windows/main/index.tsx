import { render } from "solid-js/web"

import Main from "./Main";

const wrapper = document.getElementById('app');

if (!wrapper) {
	throw new Error('Wrapper div not found');
}

render(() => <Main/>, wrapper);
