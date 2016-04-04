var tnt_tooltip = require("tnt.tooltip");
var allCounter = 1;
var treeCounter = 1;
var menu = function (container, bubblesView, ta, currTA, showAll) {
    if (showAll) {
        allCounter++;
    }
    d3.select(container)
        .append("div")
        .attr("class", "hamburger-frame")
        .on("click", function (d) {
            var confTooltip = tnt_tooltip.list()
                .id(1)
                .width(180)
                .show_closer(false);

            var obj = {};
            obj.header = "Configuration";
            obj.rows = [];
            obj.rows.push({
                value : (allCounter%2 ? "Show " : "Hide") + " all diseases",
                link: function () {
                    var root = bubblesView.root();
                    bubblesView.focus(root);
                    if (allCounter%2) {
                        root.property("_fullyOpened", true);
                        root.apply(function (node) {
                            node.property("__expanded", true);
                            if (node.property("__focused")) {
                                node.property("__focused", false);
                            }
                            if (node.parent() && node.is_collapsed()) {
                                node.toggle();
                            }
                        });
                    } else {
                        root.property("_fullyOpened", false);
                        root.apply(function (node) {
                            node.property("__expanded", false);
                            if (node.property("__focused")) {
                                node.property("__focused", false);
                            }

                            if (node.parent() && !node.is_collapsed()) {
                                node.toggle();
                            }
                        }, true);

                    }
                    bubblesView.update();
                    allCounter++;
                }
            });
            obj.rows.push({
                value: (treeCounter%2 ? "Show" : "Hide") + " disease ontology structure",
                link: function () {
                    // Reset all the opened nodes
                    // if (currTA && !bubblesView.root().property("_fullyOpened")) {
                    //     if (bubblesView.root().property("_fullyOpened")) {
                    //         bubblesView.root().apply(function (n) {
                    //             console.log(n.property("__disease_name"));
                    //             console.log(n.is_collapsed());
                    //             if (n.is_collapsed()) {
                    //                 n.toggle();
                    //             }
                    //         }, true);
                    //     }
                    // }
                    if (currTA) {
                        currTA.apply(function (n) {
                            if (n.data().depth===1) {
                                return;
                            }
                            if (!n.is_collapsed()) {
                                n.toggle();
                                if (n.property('__focused')) {
                                    n.property('__focused', false);
                                }
                            }
                        }, true);
                    }

                    // If we are in a deep node, focus on its TA
                    if (bubblesView.focus().data().depth > 1) {
                        bubblesView.focus(currTA || bubblesView.root());
                    }

                    // Switch to flat or tree children structure
                    var tas = bubblesView.root().children(true);
                    for (var i=0; i<tas.length; i++) {
                        // Collapse the current view
                        if (!bubblesView.root().property("_fullyOpened")) {
                            bubblesView.root().apply(function (n) {
                                if (n.data().depth < 2) {
                                    return;
                                }
                                if (!n.is_collapsed()) {
                                    n.toggle();
                                }
                            }, true);
                        }

                        var ta = tas[i];
                        var taData = ta.data();
                        var field;
                        if (ta.is_collapsed()) {
                            field = "_children";
                        } else {
                            field = "children";
                        }
                        taData._bk = taData[field];
                        taData[field] = taData.childrenTree;
                        // We set the coords of the parent in each children
                        var oneChild = taData._bk[0];
                        var parentCoords = {
                            initX: oneChild._parent.initX,
                            initY: oneChild._parent.initY,
                            x: oneChild._parent.x,
                            y: oneChild._parent.y
                        };
                        for (var c=0; c<taData[field].length; c++) {
                            taData[field][c]._parent.initX = parentCoords.initX;
                            taData[field][c]._parent.initY = parentCoords.initY;
                            taData[field][c]._parent.x = parentCoords.x;
                            taData[field][c]._parent.y = parentCoords.y;
                        }
                        taData.childrenTree = taData._bk;
                    }
                    if (bubblesView.root().property("_fullyOpened")) {
                        bubblesView.root().apply(function (n) {
                            if (n.is_collapsed()) {
                                n.toggle();
                            }
                        }, true);
                    }

                    bubblesView.update();
                    treeCounter++;
                }
            });
            obj.rows.push({
                value: '<button>Close</button>',
                link: function() {
                    // Closes by default
                }
            });
            confTooltip.call(this, obj);
        });


    var burger = d3.select(container)
        .append("div")
        .attr("class", "hamburger-menu");

    // The menu
};

module.exports = exports = menu;
