import { render } from "solid-js/web";
import Overlay from "./Overlay.tsx";

const wrapper = document.getElementById('app');

if (!wrapper) {
	throw new Error('Wrapper div not found');
}

render(() => <Overlay />, wrapper);
