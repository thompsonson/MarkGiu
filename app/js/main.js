/* Main javascript  */

$(function(){
    // Load native UI library
    var gui = require('nw.gui');

    //instantiate markgiu app and bind it to DOM
    var markGiuApp = new markgiu.AppGui();
    markGiuApp.bindChoosers('#choosefile', '#savefileas');
    ko.applyBindings(markGiuApp, $("#wrap")[0]);

    win = gui.Window.get();
    var nativeMenuBar = new gui.Menu({ type: "menubar" });
    try {
        nativeMenuBar.createMacBuiltin("My App");
        win.menu = nativeMenuBar;
    } catch (ex) {
        console.log(ex.message);
    }

    

    //set up keyboard shortcuts
    document.addEventListener('keyup', function (e) {
		if (e.keyCode == 'O'.charCodeAt(0) && e.ctrlKey) {
            markGiuApp.chooseFileToOpen();
		} else if (e.keyCode == 'S'.charCodeAt(0) && e.ctrlKey) {
            //markGiuApp.saveFile(); // not used as now auto saving...
            $('#savefileas').click();
		} else if (e.keyCode == 'N'.charCodeAt(0) && e.ctrlKey) {
            markGiuApp.addTabNew();
        }
	});

    //show window
    gui.Window.get().show();
    
});