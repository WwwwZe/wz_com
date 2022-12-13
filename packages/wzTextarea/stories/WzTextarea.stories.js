import WzTextarea from '../index'

export default {
  name: 'WzTextarea',
  component: WzTextarea
}

export const wz_textarea = () => ({
  components: { WzTextarea },
  template: "<wz-textarea></wz-textarea>"
})

export const wz_textarea_insert = () => ({
  components: { WzTextarea },
  template: "<wz-textarea :text='text'></wz-textarea>",
  data() {
    return {
      text: ['大骚包', '骚骚强']
    }
  }
})