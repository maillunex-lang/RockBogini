import './storyDialog.css';

export type StoryLine={key:string;infoKey:string;text:string;npc?:number};

export function StoryDialog({title,lines,onContinue,onSkip}:{title:string;lines:StoryLine[];onContinue:()=>void;onSkip:()=>void}){
 return <div className="story-dialog" role="dialog" aria-modal="true" aria-label={title}>
  <div className="story-dialog-card">
   <header>
    <h2>{title}</h2>
    <button type="button" onClick={onSkip}>Пропустить</button>
   </header>
   <ol className="story-dialog-lines">
    {lines.map(l=><li key={l.key} data-npc={l.npc??0}><p>{l.text}</p></li>)}
   </ol>
   <footer>
    <button type="button" className="story-dialog-continue" onClick={onContinue}>Далее</button>
   </footer>
  </div>
 </div>;
}
