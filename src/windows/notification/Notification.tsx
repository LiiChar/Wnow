import { onMount } from 'solid-js';
import '../../assets/style/index.css';

import { initSettings, applyTheme } from '../../shared/stores/settings';
import { Notification as Not } from '@/widget/notification/Notification';

function Notification() {


  onMount(() => {
    document.body.style.background = 'transparent';
    initSettings()
      .then(settings => {
        applyTheme(settings.theme);
        
      })
      .catch(console.error);
  });



  return <Not />;
}

export default Notification;
