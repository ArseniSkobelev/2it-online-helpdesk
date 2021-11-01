function send() {
    var data = "firstname=" + document.getElementById("input1").value + "&lastname=" + document.getElementById("input2").value + "&email=" + document.getElementById("input3").value + "&title=" + document.getElementById("input4").value + "&message=" + document.getElementById("input5").value
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