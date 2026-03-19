document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.querySelector("#loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            if (!loginForm.username.value || !loginForm.password.value) {
                e.preventDefault();
                alert("Fill all fields");
            }
        });
    }

});