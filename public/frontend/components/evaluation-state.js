// In-memory answers only. Scores and attempt limits remain authoritative on the server.
export function evaluationState(attempt, now=()=>performance.now()) {
  const started=now();
  const answers=Array(attempt.questions.length).fill(null);
  return {
    answers,
    choose(index, value) {
      if(!Number.isInteger(index)||index<0||index>=answers.length||!Number.isInteger(value)||value<0||value>=attempt.questions[index].choices.length)throw new Error('Respuesta no válida.');
      answers[index]=value;
    },
    completed:()=>answers.filter(value=>value!==null).length,
    missing:()=>answers.findIndex(value=>value===null),
    remaining() {
      if(!attempt.expires_at)return null;
      return Math.max(0,Math.ceil(attempt.expires_at-attempt.server_time-(now()-started)/1000));
    },
    payload() {
      if(answers.includes(null))throw new Error('Responde todas las preguntas antes de enviar.');
      return {token:attempt.token,answers:[...answers]};
    },
  };
}
export function remainingLabel(seconds) {
  if(seconds===null)return 'Sin límite de tiempo';
  const minutes=Math.floor(seconds/60),rest=seconds%60;
  return `${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`;
}
