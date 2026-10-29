export type PortfolioView='work'|'about';
export const viewFromPath=(path:string):PortfolioView=>path.replace(/\/$/,'')==='/about'?'about':'work';
export function updateViewAddress(view:PortfolioView,push:boolean){
 const path=view==='about'?'/about':'/';
 if(push&&viewFromPath(window.location.pathname)!==view)window.history.pushState({view},'',path);
 document.title=view==='about'?'Vishwas Kamath — About':'Vishwas Kamath — Motion Portfolio';
}
