import {Fish,Waves,Mountain,Anchor} from 'lucide-react';
import {categories,type Category} from '@/lib/domain';

// Code-native artwork makes records without a photograph feel like part of the journal.
export function CatchArt({category}:{category:Category}){
 const Icon=category==='trout'?Mountain:category==='bass'?Anchor:Waves;
 return <div className={'catch-art catch-art-'+category} aria-hidden="true"><div className="catch-art-orbit"/><span className="catch-art-number">FIELD NOTES / {category.toUpperCase()}</span><Icon className="catch-art-landscape" size={120}/><Fish className="catch-art-fish" size={96}/><span className="catch-art-ruler">0 ─── 10 ─── 20 ─── 30 ─── 40</span><span className="catch-art-label">{categories[category]}<small>EVERY CATCH HAS A STORY</small></span></div>;
}
