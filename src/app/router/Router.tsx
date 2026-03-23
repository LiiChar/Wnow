import { Router as RootRouter, Route } from '@solidjs/router';
import { DictionaryPage } from '../../pages/DictionaryPage';
import { SettingsPage } from '../../pages/SettingsPage';
import { StudyPage } from '../../pages/StudyPage';
import { Layout } from '../layout/Layout';

export const Router = () => {
	return (
		<RootRouter root={Layout}>
			<Route path='/' component={DictionaryPage} />
			<Route path='/study' component={StudyPage} />
			<Route path='/settings' component={SettingsPage} />
		</RootRouter>
	);
};
