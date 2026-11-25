import {useRef} from 'react';
import './plotVideo.css';

export function PlotVideoPlayer({
 src,
 title,
 onContinue,
 onSkip,
}:{src:string;title:string;onContinue:()=>void;onSkip:()=>void}){
 const ref=useRef<HTMLVideoElement>(null);
 return <div className="plot-video" role="dialog" aria-modal="true" aria-label={title}>
  <div className="plot-video-card">
   <header>
    <h2>{title}</h2>
    <button type="button" onClick={onSkip}>Пропустить</button>
   </header>
   <video
    ref={ref}
    className="plot-video-player"
    src={src}
    controls
    playsInline
    autoPlay
    onEnded={onContinue}
   />
   <footer>
    <button type="button" className="plot-video-continue" onClick={onContinue}>Далее</button>
   </footer>
  </div>
 </div>;
}
