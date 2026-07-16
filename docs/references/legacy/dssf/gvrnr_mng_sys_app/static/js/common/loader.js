const loaderBody = document.querySelector(".loader-body");
const loaderText = document.querySelector(".loader-text");

const openLoader = (text = "") => {
  loaderBody.style.display = "flex";
  loaderText.innerHTML = text;
};

const closeLoader = () => {
  loaderBody.style.display = "none";
  loaderText.innerHTML = "";
};
