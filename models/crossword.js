module.exports = function(Schema){
  var CrosswordSchema = new Schema({
    side: String,
    grid: [{
      letter: String,
      num: Number,
      active: String,
      index: Number,
      wordAcross: Number,
      wordDown: Number
    }],
    answers: {
      across: [String],
      down: [String]
    },
    guessed: [String],
    correct: [Number],
    gridnums: [Number],
    across: [String],
    down: [String],
    date: String
  });

  return CrosswordSchema;
};