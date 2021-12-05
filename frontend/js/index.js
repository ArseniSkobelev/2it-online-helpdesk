function send() {
  let data = "name="+document.getElementById("name").value+"&email="+document.getElementById("email").value+"&title="+document.getElementById("title").value+"&phonenum="+document.getElementById("phonenum").value+"&avdeling="+document.getElementById("avd").value+"&message="+document.getElementById("text").value;
  fetch("http://localhost:3000/form?" + data, {
    method: "post"
  }).then(console.log("request sent"))
}