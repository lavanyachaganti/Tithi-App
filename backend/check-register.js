const axios = require('axios');
(async () => {
  try {
    const email = 'lavanya.chaganti21@gmail.com';
    console.log('Registering', email);
    const reg = await axios.post('http://127.0.0.1:5000/api/register', {
      name: 'lavanya chaganti',
      email,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    }, { headers: { 'Content-Type': 'application/json' } });

    console.log('REGISTER', reg.status, reg.data);
  } catch (err) {
    console.error('ERROR', err.message);
    if (err.response) {
      console.error('RESPONSE', err.response.status, err.response.data);
    }
  }
})();