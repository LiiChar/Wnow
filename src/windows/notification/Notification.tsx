import { onMount } from 'solid-js';

import { Notification as Not } from '@/widget/notification/Notification';

import { applyTheme, initSettings } from '../../shared/stores/settings';

import '../../assets/style/index.css';

const Notification = () => {


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
