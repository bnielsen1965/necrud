
window.addEventListener('load', (event) => {
	let q = new URLSearchParams(window.location.search);
	let error = q.get('error');
	let username = q.get('username');

	if (error) document.getElementById('errors').innerHTML += error + '<br>';
	if (username) document.getElementById('username').value = username;
});
