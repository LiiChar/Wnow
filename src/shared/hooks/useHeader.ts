import { onMount } from "solid-js";
import { setLayoutStore } from "../stores/layout";


const useHeader = (title: string, description?: string) => {
  onMount(() => {
    setLayoutStore('headerLabel', title);
    setLayoutStore('headerDescription', description);
  })
};

export { useHeader };