// Turns a videocdn link list into playable items, sorted and filtered by quality.
export function extractItems(str, max_quality){
    try{
        let items = str.split(',').map(item=>{
            return {
                quality: parseInt(item.match(/\[(\d+)p\]/)[1]),
                file: 'http:' + item.replace(/\[\d+p\]/,'').split(' or ')[0]
            }
        }).filter(item=>{
            return item.quality <= max_quality
        })

        items.sort((a,b)=>{
            return b.quality - a.quality
        })

        return items
    }
    catch(e){}

    return []
}
