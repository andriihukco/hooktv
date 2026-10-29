import Base from './base'
import ModuleMask from './module/module'
import ModuleMap from './module/map'
import {hydrate} from '../../games/catalog'

class Card extends Base {
    constructor(data) {
        super(hydrate(data))

        let module = this.params.module || (this.data.game ? ModuleMask.only('Card', 'Style', 'Callback') : ModuleMask.MASK.base)

        ModuleMask.getNames(module).map(name => ModuleMap[name]).forEach(mod => this.use(mod))

        this.emit('init')
    }
}

export default Card