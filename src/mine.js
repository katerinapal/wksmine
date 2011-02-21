////////////// MODEL /////////////

BoxState = {
    COVERED: "covered",
    OPENED: "opened",
    BOMBED: "bombed",
    FLAGED: "flaged"
};

function BoxInfo(row, col){
    this.row = row;
    this.col = col;
    this.hasMine = false;
    this.surrounding = 0;
    this.state = BoxState.COVERED;
}

DEFAULTS = {
    rows: 16,
    cols: 16,
    mines: 40,
    makeModel: function(){
        return new MineModel(this.rows, this.cols, this.mines);
    }
};

function MineModel(rows, cols, mines){
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
    this.infos = [];
    for (var r = 0; r < rows; r++) {
        var curRow = [];
        this.infos.push(curRow);
        for (var c = 0; c < cols; c++) {
            curRow.push(new BoxInfo(r, c));
        }
    }
    
    this.generateMines();
    
    this.listeners = [];
    this.gameOver = false;
    this.win = false;
    this.flagsRemain = this.mines;
    this.boxesRemain = this.rows * this.cols - this.mines;
}

MineModel.prototype.callWithSurroundings = function(row, col, func){
    for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
            if (dr == 0 && dc == 0) {
                continue;
            }
            
            var nr = row + dr;
            var nc = col + dc;
            
            if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) {
                continue;
            }
            
            func(nr, nc);
        }
    }
};

MineModel.prototype.getSurroundingInfos = function(info){
    var thisthis = this;
    var results = [];
    this.callWithSurroundings(info.row, info.col, function(nr, nc){
        var bi = thisthis.infos[nr][nc];
        results.push(bi);
    });
    
    return results;
};

MineModel.prototype.generateMines = function(){
    var posses = [];
    for (var r = 0; r < this.rows; r++) {
        for (var c = 0; c < this.cols; c++) {
            posses.push([Math.random(), [r, c]]);
        }
    }
    posses.sort(function(p1, p2){
        return p1[0] - p2[0];
    });
    
    for (var i in posses) {
        var r = posses[i][1][0];
        var c = posses[i][1][1];
        var bi = this.infos[r][c];
        bi.hasMine = i < this.mines;
    }
    
    for (var r = 0; r < this.rows; r++) {
        for (var c = 0; c < this.cols; c++) {
            var bi = this.infos[r][c];
            bi.surrounding = 0;
            var thisthis = this;
            
            var sbi = this.getSurroundingInfos(bi);
            for (var i in sbi) {
                if (sbi[i].hasMine) {
                    bi.surrounding++;
                }
                
            }
        }
    }
};

MineModel.prototype.uncover = function(info){
    if (this.gameOver) {
        return;
    }
    switch (info.state) {
        case BoxState.COVERED:
            if (info.hasMine) {
                info.state = BoxState.BOMBED;
                this.gameOver = true;
                for (var i in this.listeners) {
                    this.listeners[i].gameOver();
                }
            }
            else {
                info.state = BoxState.OPENED;
                this.boxesRemain--;
                
                for (var i in this.listeners) {
                    this.listeners[i].stateChanged(info);
                }
                
                this.checkWin();
                
                if (info.surrounding == 0) {
                    this.uncoverSurroundings(info);
                }
            }
            
            break;
    }
};

MineModel.prototype.flag = function(info){
    if (this.gameOver) {
        return;
    }
    switch (info.state) {
        case BoxState.COVERED:
            info.state = BoxState.FLAGED;
            this.flagsRemain--;
            
            for (var i in this.listeners) {
                this.listeners[i].stateChanged(info);
            }
            
            this.checkWin();
            
            break;
    }
};

MineModel.prototype.unflag = function(info){
    if (this.gameOver) {
        return;
    }
    switch (info.state) {
        case BoxState.FLAGED:
            info.state = BoxState.COVERED;
            this.flagsRemain++;
            
            for (var i in this.listeners) {
                this.listeners[i].stateChanged(info);
            }
            
            break;
    }
};

MineModel.prototype.uncoverSurroundings = function(info){
    if (this.gameOver) {
        return;
    }
    var sbi = this.getSurroundingInfos(info);
    for (var i in sbi) {
        this.uncover(sbi[i]);
    }
};

MineModel.prototype.tryUncoverSurroundings = function(info){
    if (this.gameOver) {
        return;
    }
    var flags = 0;
    var sbi = this.getSurroundingInfos(info);
    for (var i in sbi) {
        if (sbi[i].state == BoxState.FLAGED) {
            flags++;
        }
    }
    if (flags == info.surrounding) {
        this.uncoverSurroundings(info);
    }
    
};

MineModel.prototype.checkWin = function(){
    if (this.flagsRemain == 0 && this.boxesRemain == 0) {
        this.gameOver = true;
        for (var i in this.listeners) {
            this.listeners[i].win();
        }
    }
};

//////////////// VIEW /////////////////

ClickAction = {
	OPEN: "open",
	FLAG: "flag",
	inverse: function(action) {
		switch(action) {
			case this.OPEN:
				return this.FLAG;
			case this.FLAG:
				return this.OPEN;
		}
	}
};

theView = {
    model: null,
	clickAction: ClickAction.OPEN,
    initView: function(){
		$("#action-open").attr("checked","checked");
		
        $("#mineboard-body > *").remove();
        for (var r = 0; r < this.model.rows; r++) {
            var tr = document.createElement("tr");
            $("#mineboard-body").append(tr);
            for (var c = 0; c < this.model.cols; c++) {
                var td = document.createElement("td");
                $(tr).append(td);
                td.id = this.rowColToId(r, c);
                td.row = r;
                td.col = c;
                
                var view = this;
                $(td).click(function(event){
                    view.onClicked(this, event.ctrlKey);
                });
                
                var info = this.model.infos[r][c];
                this.updateBox(info, td);
            }
        }
		this.updateStatistics();
    },
    rowColToId: function(row, col){
        return "minebox-" + row + "-" + col;
    },
    updateBox: function(info, td){
        $(td).removeClass();
        $(td).addClass("minebox minebox-" + info.state);
        if (info.state == BoxState.OPENED) {
            $(td).addClass("minebox-number-" + info.surrounding);
        }
        
        if (info.state == BoxState.OPENED && info.surrounding > 0) {
            $(td).text(info.surrounding);
        }
        else {
            $(td).text(" ");
        }
        
        if (this.model.gameOver) {
            if (info.hasMine) {
                $(td).addClass("minebox-gameover-mine");
            }
            else {
                $(td).addClass("minebox-gameover-nomine");
            }
        }
    },
    updateStatistics: function(){
        $("#stat-box").text("" + this.model.flagsRemain + "/" + this.model.mines);
    },
    newGame: function(){
        this.model = DEFAULTS.makeModel();
        this.model.listeners.push(this);
        this.initView();
    },
    onClicked: function(box, ctrlKey){
        if (this.model.gameOver) {
            return;
        }
        var row = box.row;
        var col = box.col;
        var info = this.model.infos[row][col];
		
		var currentAction = this.clickAction;
		if (ctrlKey) {
			currentAction = ClickAction.inverse(currentAction);
		}
		
        switch (currentAction) {
			case ClickAction.FLAG:
	            switch (info.state) {
	                case BoxState.COVERED:
	                    this.model.flag(info);
	                    break;
	                case BoxState.OPENED:
	                    this.model.tryUncoverSurroundings(info);
	                    break;
	                case BoxState.FLAGED:
	                    this.model.unflag(info);
	                    break;
	            }
			break;
	        case ClickAction.OPEN:
	            switch (info.state) {
	                case BoxState.COVERED:
	                    this.model.uncover(info);
	                    break;
	                case BoxState.OPENED:
	                    this.model.tryUncoverSurroundings(info);
	                    break;
	            }
			break;
        }
    },
    stateChanged: function(info){
        if (this.model.gameOver) {
            return;
        }
        var td = document.getElementById(this.rowColToId(info.row, info.col));
        this.updateBox(info, td);
        this.updateStatistics();
    },
    gameOver: function(){
        for (var r = 0; r < this.model.rows; r++) {
            for (var c = 0; c < this.model.cols; c++) {
                var info = this.model.infos[r][c];
                var td = document.getElementById(this.rowColToId(info.row, info.col));
                this.updateBox(info, td);
            }
        }
    },
    win: function(){
        $("#win-box").show();
    }
    
};

$(document).ready(function(){
	$("#action-open").click(function() {
		theView.clickAction = ClickAction.OPEN;
	});
	
	$("#action-flag").click(function() {
		theView.clickAction = ClickAction.FLAG;
	});
	
    theView.newGame();
});
