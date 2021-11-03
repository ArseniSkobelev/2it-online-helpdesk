function send() {
  let data = "name="+document.getElementById("name").value+"&email="+document.getElementById("email").value+"&title="+document.getElementById("title").value+"&phonenum="+document.getElementById("phonenum").value+"&avdeling="+document.getElementById("avdeling").value+"&message="+document.getElementById("message").value;

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;
    if (xhr.status >= 200 && xhr.status < 300) {
      window.location.replace("../success.html")
    } else {
      window.location.replace("../error.html")
    }
    console.log('Request sent');
  };
  xhr.open('POST', 'http://3.16.42.132:3000/form?' + data);
  xhr.send();
}