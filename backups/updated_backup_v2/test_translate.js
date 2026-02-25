import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
    const translate = require('translate-google');
    console.log('Require success');
    translate('Hello world', { to: 'es' }).then(res => {
        console.log('Translation success:', res);
    }).catch(err => {
        console.error('Translation error:', err);
    });
} catch (e) {
    console.error('Require failed:', e);
}
