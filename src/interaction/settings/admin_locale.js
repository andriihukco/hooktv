import Storage from '../../core/storage/storage'

const messages = {
    en: {
        username: 'Admin username',
        password: 'Admin password',
        loginFailed: 'Incorrect username or password.',
        loginLocked: 'Too many attempts. Try again in 15 minutes.',
        networkError: 'Could not connect to the admin service.',
        heading: 'HOOK TV control room',
        language: 'Admin language',
        english: 'English',
        ukrainian: 'Українська',
        features: 'System features',
        plugins: 'HOOK TV plugins',
        onlineSources: 'Online sources',
        externalPlugins: 'Community plugins',
        selected: 'Selected',
        save: 'Save changes',
        reload: 'Reload settings',
        saveBeforeReload: 'Save or leave this panel before reloading.',
        loading: 'Loading system settings…',
        loaded: 'Configuration loaded. Changes apply after saving.',
        saving: 'Saving settings…',
        saved: 'Saved. Devices will apply changes on their next launch.',
        saveFailed: 'Could not save system settings.',
        loadFailed: 'Could not load system settings.',
        configConflict: 'Settings changed elsewhere. Reload before saving.',
        signInAgain: 'Admin session expired. Open this panel again from Settings.',
        changes: 'Unsaved changes',
        unchanged: 'All changes are saved',
        enabled: 'On',
        disabled: 'Off',
        original: 'Original plugin',
        reviewPending: 'Review pending',
        onlineMedia: 'Online media',
        localBundle: 'Built-in plugin',
        globalDisabled: 'Blocked by a system feature',
        localeSaved: 'Admin language updated.',
        revision: 'Revision',
        default: 'Default',
        unknownSource: 'External plugin'
    },
    uk: {
        username: 'Ім’я адміністратора',
        password: 'Пароль адміністратора',
        loginFailed: 'Неправильне ім’я або пароль.',
        loginLocked: 'Забагато спроб. Спробуйте знову через 15 хвилин.',
        networkError: 'Не вдалося підключитися до служби адміністратора.',
        heading: 'Панель керування HOOK TV',
        language: 'Мова адміністратора',
        english: 'English',
        ukrainian: 'Українська',
        features: 'Функції системи',
        plugins: 'Плагіни HOOK TV',
        onlineSources: 'Онлайн-джерела',
        externalPlugins: 'Плагіни спільноти',
        selected: 'Вибрано',
        save: 'Зберегти зміни',
        reload: 'Оновити налаштування',
        saveBeforeReload: 'Збережіть зміни або закрийте панель перед оновленням.',
        loading: 'Завантаження налаштувань системи…',
        loaded: 'Налаштування завантажено. Зміни діятимуть після збереження.',
        saving: 'Збереження налаштувань…',
        saved: 'Збережено. Пристрої застосують зміни під час наступного запуску.',
        saveFailed: 'Не вдалося зберегти налаштування системи.',
        loadFailed: 'Не вдалося завантажити налаштування системи.',
        configConflict: 'Налаштування змінилися в іншому сеансі. Оновіть панель перед збереженням.',
        signInAgain: 'Сеанс адміністратора завершився. Відкрийте панель знову через Налаштування.',
        changes: 'Є незбережені зміни',
        unchanged: 'Усі зміни збережено',
        enabled: 'Увімкнено',
        disabled: 'Вимкнено',
        original: 'Оригінальний плагін',
        reviewPending: 'Очікує перевірки',
        onlineMedia: 'Онлайн-медіа',
        localBundle: 'Вбудований плагін',
        globalDisabled: 'Заблоковано функцією системи',
        localeSaved: 'Мову адміністратора оновлено.',
        revision: 'Версія налаштувань',
        default: 'За замовчуванням',
        unknownSource: 'Зовнішній плагін'
    }
}

export function getAdminLocale(){
    return Storage.get('hooktv_admin_locale', 'en') === 'uk' ? 'uk' : 'en'
}

export function setAdminLocale(locale){
    Storage.set('hooktv_admin_locale', locale === 'uk' ? 'uk' : 'en')
}

export function adminText(key, locale = getAdminLocale()){
    return messages[locale][key] || messages.en[key] || key
}
