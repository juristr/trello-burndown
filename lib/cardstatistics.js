/*
 * Trello burndown chart generator
 *
 * Author: Norbert Eder <wpfnerd+nodejs@gmail.com>
 */
var fs = require('fs');

var CardStatistics = function() { }

CardStatistics.prototype.generate = function(cards, finishList, callback) {

	var data = {
		"estimate": 0,
		"effort": []
	};

	var reg = /^\[(\d+)\|(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\]\s*(.*)$/;

	for (var i = 0; i < cards.length; i++) {
		var card = cards[i];

		var title = card.name;

		var matches = reg.exec(title);

		if (matches.length > 1) {
			var prio = matches[1];		
			var estimate = parseInt(matches[2]);
			var effort = parseFloat(matches[3]);

			if (card.actions) {
				for (var idxActions = 0; idxActions < card.actions.length; idxActions++) {
					if (card.actions[idxActions]) {
						if (card.actions[idxActions].data.listAfter 
							&& card.actions[idxActions].data.listBefore
							&& card.actions[idxActions].data.listAfter.name === finishList) {

							var date = new Date(Date.parse(card.actions[idxActions].date));
							var cleanDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
						
							if (!data.effort.length) {
								data.effort[0] = { date: cleanDate, estimate: estimate, effort: effort };
							} else {
								var found = false;
								for (var idxEffort = 0; idxEffort < data.effort.length; idxEffort++) {
									if (Date.parse(data.effort[idxEffort].date) === Date.parse(cleanDate)) {
										data.effort[idxEffort].estimate += estimate;
										data.effort[idxEffort].effort += effort;
										found = true;
									}
								}
								if (!found) {
									data.effort[data.effort.length] = { date: cleanDate, estimate: estimate, effort: effort };
								}
							}
						}
					}
				}
			}

			data.estimate += estimate;
		}
	}
	callback(null, data);
}

CardStatistics.prototype.export = function(data, resources, days, callback) {
	var statsData = [];
	var plannedDays = getPlannedDays(resources);
	var averageDayEffort = data.estimate / plannedDays;

	var plannedDaysCount = 0;
	var openEstimate = data.estimate;
	var totalEffort = 0;

	for (var date = 0; date < days.length; date++) {
		var dateToReceive = new Date(Date.parse(days[date]));
		var effortContent = getDateData(dateToReceive, data.effort);

		if (!effortContent) {
			statsData[date] = { day: date, date: dateToReceive, totalEstimate: data.estimate, idealEstimate: data.estimate - (averageDayEffort * plannedDaysCount), openEstimate: openEstimate, doneEstimate: 0, effort: 0, totalEffort: 0 };
		} else {
			totalEffort += effortContent.effort;
			statsData[date] = { day: date, date: dateToReceive, totalEstimate: data.estimate, idealEstimate: data.estimate - (averageDayEffort * plannedDaysCount), openEstimate: openEstimate, doneEstimate: effortContent.estimate, effort: effortContent.effort, totalEffort: totalEffort };
			openEstimate = openEstimate - effortContent.estimate;
		}

		plannedDaysCount += Math.floor(resources[date]);
	}

	saveCSV(statsData, callback);
}

function saveCSV(data, callback) {
	var csv = '';
	csv += "Day;Estimate total;Estimate ideal;Estimate open;Estimate done;Effort;Effort total\r";
	for (var line = 0; line < data.length; line++) {
		var lineData = data[line];
		csv += lineData.day + ";" + lineData.totalEstimate + ";" + lineData.idealEstimate.toString().replace(".", ",") + ";" + lineData.openEstimate + ";" + lineData.doneEstimate + ";" + lineData.effort.toString().replace(".",",") + ";" + lineData.totalEffort.toString().replace(".",",") + ";\r";
	}
	fs.writeFile("export.csv", csv, function(err) {
		callback(err);
	})
}

function getPlannedDays(resourceArray) {
	var plannedDays = 0;
	for (var i = 0; i < resourceArray.length; i++) {
		plannedDays += Math.floor(resourceArray[i]);
	}
	return plannedDays;
}

function getDateData(date, stats) {
	var compareDate = Date.parse(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
	for (var i = 0; i < stats.length; i++) {
		var statsDate = Date.parse(new Date(stats[i].date.getFullYear(), stats[i].date.getMonth(), stats[i].date.getDate()));
		if (statsDate === compareDate) {
			return stats[i];
		}
	}
	return null;
}

module.exports = CardStatistics;