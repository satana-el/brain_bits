// --- Utilities ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}
function decodeHTML(str){
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}
function show(el){ el.classList.remove('hidden') }
function hide(el){ el.classList.add('hidden') }

// --- State ---
const state = {
  questions: [],
  index: 0,
  score: 0,
  settings: { category: '', difficulty: '', amount: 10 },
};

// --- Setup: fetch categories ---
async function loadCategories(){
  const select = $('#category');
  $('#setupStatus').textContent = 'Loading categories…';
  try{
    const res = await fetch('https://opentdb.com/api_category.php');
    if(!res.ok) throw new Error('Failed to load categories');
    const data = await res.json();
    data.trivia_categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.name;
      select.appendChild(opt);
    });
    $('#setupStatus').textContent = 'Ready.';
  }catch(err){
    $('#setupStatus').textContent = 'Could not load categories. You can still play with Any Category.';
  }
}

// --- Start Quiz ---
async function startQuiz(){
  // read settings
  state.settings.category = $('#category').value;
  state.settings.difficulty = $('#difficulty').value;
  const amountVal = parseInt($('#amount').value,10);
  state.settings.amount = isNaN(amountVal) ? 10 : Math.max(3, Math.min(50, amountVal));

  state.index = 0; state.score = 0; state.questions = [];
  $('#smallScore').textContent = `Score: ${state.score}`;
  $('#progressBar').style.width = '0%';
  $('#progressText').textContent = 'Loading…';

  hide($('#setup')); hide($('#results')); hide($('#error'));
  show($('#loading'));

  try{
    const params = new URLSearchParams({ amount: String(state.settings.amount), type: 'multiple' });
    if(state.settings.category) params.append('category', state.settings.category);
    if(state.settings.difficulty) params.append('difficulty', state.settings.difficulty);
    const url = `https://opentdb.com/api.php?${params.toString()}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Network error');
    const data = await res.json();
    if(data.response_code !== 0 || !data.results?.length){
      throw new Error('No questions returned. Try different settings.');
    }
    state.questions = data.results.map(q => ({
      question: decodeHTML(q.question),
      correct: decodeHTML(q.correct_answer),
      answers: shuffle([q.correct_answer, ...q.incorrect_answers].map(decodeHTML)),
      category: q.category,
      difficulty: q.difficulty,
    }));
    hide($('#loading'));
    show($('#quiz'));
    renderQuestion();
  }catch(err){
    hide($('#loading')); show($('#error'));
    $('#errorMsg').textContent = err.message || 'Failed to load questions.';
  }
}

function renderQuestion(){
  const q = state.questions[state.index];
  if(!q){ return; }
  $('#question').textContent = q.question;
  $('#categoryTag').textContent = q.category || '';
  $('#difficultyTag').textContent = q.difficulty ? `Difficulty: ${q.difficulty}` : '';

  // progress
  const total = state.questions.length;
  $('#progressText').textContent = `Question ${state.index+1} of ${total}`;
  $('#progressBar').style.width = `${((state.index)/total)*100}%`;

  // answers
  const answersEl = $('#answers');
  answersEl.innerHTML = '';
  q.answers.forEach(answer => {
    const btn = document.createElement('button');
    btn.className = 'answer';
    btn.textContent = answer;
    btn.addEventListener('click', () => onAnswer(btn, q.correct));
    answersEl.appendChild(btn);
  });

  $('#nextBtn').disabled = true;
}

function onAnswer(btn, correct){
  // prevent multiple selections
  if($$('.answer').some(b => b.disabled)) return;

  const chosen = btn.textContent;
  if(chosen === correct){
    btn.classList.add('correct');
    state.score++;
  }else{
    btn.classList.add('wrong');
    const rightBtn = $$('.answer').find(b => b.textContent === correct);
    rightBtn?.classList.add('correct');
  }
  $$('.answer').forEach(b => b.disabled = true);
  $('#nextBtn').disabled = false;
  $('#smallScore').textContent = `Score: ${state.score}`;

  // update progress to include current question completion
  const total = state.questions.length;
  $('#progressBar').style.width = `${((state.index+1)/total)*100}%`;
}

function next(){
  if(state.index < state.questions.length - 1){
    state.index++;
    renderQuestion();
  }else{
    endQuiz();
  }
}

function endQuiz(){
  hide($('#quiz'));
  show($('#results'));
  const total = state.questions.length;
  $('#finalScore').textContent = `${state.score} / ${total}`;
  const pct = Math.round((state.score/total)*100);
  $('#finalPercent').textContent = `${pct}% correct`;
}

// --- Event bindings ---
$('#startBtn').addEventListener('click', startQuiz);
$('#restartBtn').addEventListener('click', startQuiz);
$('#nextBtn').addEventListener('click', next);
$('#playAgain').addEventListener('click', startQuiz);
$('#changeSettings').addEventListener('click', () => { hide($('#results')); show($('#setup')); });

// Load
loadCategories();
