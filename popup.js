const { ipcRenderer } = require('electron');
ipcRenderer.on('action-update-label', (event, arg) => {
    console.log(arg);
    // Update the second window label content with the data sent from
    // the first window :) !
    let label = document.getElementById("label");
    label.innerHTML = arg.message;
    label.style.color = arg.color;
    label.style.backgroundColor = arg.backgroundColor;
});