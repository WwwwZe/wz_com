<template>
  <div class="text-message">
    <div class="warp-border-header" v-if="text && text.length">
      <template v-if="Array.isArray(text)">
        <span class="insert-text" @click="insertSpecialText(e)" v-for="(e,i) in text" :key="i">{{e.show || e.content || e}}</span>
      </template>
      <template v-else>
        <span class="insert-text" @click="insertSpecialText(text)">{{text}}</span>
      </template>
    </div>
    <div class="message-input_container">
      <div
        v-html="innerText"
        :placeholder="placeholder"
        ref="messagInput"
        class="message-input"
        :class="{'disabled': disabled}"
        :style="{'text-indent': isExchangeCode ? '90px' : ''}"
        enterkeyhint="send"
        @keydown="limit"
        @input="changeValue"
        @blur="limitLength"
        @focus="handelFocus"
        :maxLength="10"
        :contenteditable="!disabled">
      </div>
      <div class="exchange-code" v-if="isExchangeCode">[兑换码链接]</div>
      <div :class="['input-limit', (value?value.length:0)>maxLength && 'input-limit_beyond']" v-if="maxLength">{{value?value.length:0}}/{{maxLength}}</div>
    </div>
    <div
      ref="emojiBox"
      class="warp-border-footer"
      id="emoji-parent"
      v-wheel="changeEmojiList"
      wheel-disabled="0">
      <!-- :autoAdjustOverflow="false" 表情弹窗是否固定 -->
      <a-popover
        :autoAdjustOverflow="false"
        v-model="emojiVisible"
        :getPopupContainer="()=>parentNode"
        trigger="click"
        @visibleChange="hideEmojiSelect">
        <div slot="content" class="emoji-content">
          <a-carousel ref="emojiCarousel" :afterChange="changeEnd">
            <div v-for="(item,index) in emojiPageList" :key="index" class="emoji-page">
              <span class="emoji-item" v-for="(e,i) in item" :key="i" @click="insertEmoji(e.content)">{{ e.content }}</span>
            </div>
            <div slot="customPaging">
              <span class="carousel-circle"></span>
            </div>
          </a-carousel>
        </div>
        <a-icon type="smile" :class="['icon-emoji', disabled && 'icon-emoji_disabled']" />
      </a-popover>
      <div class="banned-word_container" v-if="bannedWord">
        <div v-html="bannedWordTip"></div>
      </div>
    </div>
  </div>
</template>

<script>
import deepClone from 'lodash/cloneDeep'
import { emojiList } from '../../../utils/emojiList'
import { wheel } from '../../../utils/wheel.js'
import { bannedWordList } from '../../../utils/bannedWordList'
import Icon from 'ant-design-vue/lib/icon'
import Popover from 'ant-design-vue/lib/popover'
import Carousel from 'ant-design-vue/lib/carousel'
import 'ant-design-vue/lib/icon/style/css'
import 'ant-design-vue/lib/popover/style/css'
import 'ant-design-vue/lib/carousel/style/css'

export default {
  name: 'WzTextarea',
  model: {
    prop: 'value',
    event: 'change'
  },
  components: {
    [Popover.name]: Popover,
    [Carousel.name]: Carousel,
    [Icon.name]: Icon
  },
  props: {
    value: {
      type: String,
      default: ''
    },
    /**
     * 插入内容
     *  [{
     show: '输入框顶部显示内容,没有默认选取当前数组content值',
     content: '输入框内显示内容',
     prefix: '选填，包裹字符，不填默认选取prefix字段,格式和prefix格式一样'
     }] / [ '字符串，输入框顶部和内部都为该字符串,包裹字符默认选取prefix字段' ]
     */
    text: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: '输入内容，建议shift+enter换行'
    },
    maxLength: {
      type: Number,
      default: 1000
    },
    prefix: { // 替换占位符
      type: Array,
      default: () => ['{', '}']
    },
    // 是否禁用
    disabled: {
      type: Boolean,
      default: false
    },
    free: { // 自由插入
      type: Boolean,
      default: true
    },
    // 违禁词提示
    bannedWordTipHtml: {
      type: Function,
      default: (bannedWord) => {
        return `违禁词提醒：文本中包含
        <span class="banned-word">${bannedWord}</span>
        关键词，可能会被微信风控，请谨慎使用`
      }
    },
    // 是否插入兑换码链接
    isExchangeCode: {
      type: Boolean,
      default: false
    }
  },
  directives: {
    wheel
  },
  created() {
    this.handleEmojiList()
  },
  data() {
    return {
      // 输入框内容
      innerText: this.value,
      // 控制光标跑到最前边
      isChange: true,
      // 控制emoji弹窗显示
      emojiVisible: false,
      // emoji父级弹窗
      parentNode: null,
      // emoji列表
      emojiList,
      // emoji分页列表
      emojiPageList: [],
      // 光标位置
      rangeOfInputBox: null,
      rangeStart: null,
      rangeEnd: null,
      // emoji弹窗
      emojiCarouselDisabled: false,
      // emoji滚动定时器
      timer: null
      // 内容改变定时器
      // changeTimer: null,
      // 是否标红
      // isValue: true
    }
  },
  computed: {
    // 违禁词
    bannedWord() {
      if (!this.value) return '';
      let bannedWord = ''
      new Set(bannedWordList).forEach(item => {
        if (this.value.includes(item)) {
          bannedWord += bannedWord ? `、${item}` : item
        }
      })
      return bannedWord
    },
    // 违禁词提示
    bannedWordTip() {
      return this.bannedWordTipHtml(this.bannedWord)
    }
  },
  watch: {
    value() {
      if (this.isChange) {
        let content = this.value
        // console.log(content);
        bannedWordList.forEach(item => {
          // content = content.replaceAll(item, `<span style="color:#f5222d">${item}</span>`)
          content = content.split(item).join(`<span style="color:#f5222d">${item}</span>`)
        })
        this.innerText = content
      }
    }
  },
  methods: {
    /**
     * @author 王泽
     * @time  2021-05-20
     * @param
     * @description emoji弹窗滑动
     */
    // changeEmojiList(isNext) {
    //   this.emojiCarouselDisabled = true
    //   this.$refs.emojiCarousel[isNext ? 'next' : 'prev']()
    // },
    // // 关闭弹窗
    // changeEnd() {
    //   this.emojiCarouselDisabled = false
    // },
    changeEmojiList(isNext) {
      // this.emojiCarouselDisabled = true
      this.$refs.emojiCarousel[isNext ? 'next' : 'prev']()
    },
    changeEnd() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.$refs.emojiBox.setAttribute('wheel-disabled', '0')
      }, 300)
      // this.emojiCarouselDisabled = false
    },
    /**
     * @author 王泽
     * @time  2021-04-28
     * @param
     * @description 插入特殊文本
     */
    insertSpecialText(text) {
      if (this.disabled) return;
      const content = `${(text.prefix && text.prefix[0]) || this.prefix[0] || ''}${text.content || text}${(text.prefix && text.prefix[1]) || this.prefix[1] || ''}`
      this.insertEmoji(content, this.free)
    },
    /**
     * @author 王泽
     * @time  2021-04-28
     * @param {emoji: 插入的内容, isFree: 是否自由插入}
     * @description 插入emoji表情
     */
    insertEmoji(emoji, isFree = true, isFocus = true) {
      console.log(isFocus);
      // this.getEndFocus()
      // const emojiEl = document.createElement('img');
      // emojiEl.src = '/static/img/emoji01.jpeg';
      // const emojiEl = document.createElement('span');
      // emojiEl.innerHTML = emoji
      const emojiEl = document.createTextNode(emoji);
      if (!this.rangeOfInputBox) {
        this.rangeOfInputBox = new Range();
        this.rangeOfInputBox.selectNodeContents(this.$refs.messagInput);
        // 设为非折叠状态
        this.rangeOfInputBox.collapse(false);
        this.$refs.messagInput.appendChild(emojiEl)
        return this.changeValue()
      }
      if (this.$refs.messagInput.innerText.length < this.maxLength) {
        // let startLength = this.rangeStart
        const edit = this.$refs.messagInput
        const sel = document.getSelection();
        const range = document.createRange();
        range.selectNode(edit);
        if (isFree && this.$refs.messagInput.childNodes.length) {
          const startP = this.getInsertPosition(this.rangeStart)
          const endP = this.getInsertPosition(this.rangeEnd)
          range.collapse(this.rangeStart === this.rangeEnd);
          range.setStart(startP[0], startP[1]);
          range.setEnd(endP[0], endP[1]);
        } else {
          range.collapse(true);
          // range.setStart(edit.childNodes[0], 0);
          // range.setEnd(edit.childNodes[0], 0);
          range.setStart(edit, 0);
          range.setEnd(edit, 0);
        }
        sel.removeAllRanges();
        sel.addRange(range);
        this.rangeOfInputBox = sel.getRangeAt(0)
        // 判断是否折叠状态
        if (this.rangeOfInputBox.collapsed) {
          this.rangeOfInputBox.insertNode(emojiEl);
        } else {
          this.rangeOfInputBox.deleteContents();
          this.rangeOfInputBox.insertNode(emojiEl);
        }
        // startLength += emoji.length
        // const node = this.getInsertPosition(startLength)
        // range.collapse(true);
        // range.setStart(node[0], node[1]);
        // range.setEnd(node[0], node[1]);
        // sel.removeAllRanges();
        // sel.addRange(range);
        // this.rangeOfInputBox = sel.getRangeAt(0)
      }
      this.emojiVisible = false
      this.changeValue()
      this.rangeOfInputBox.collapse(true)
      this.$refs.messagInput.blur()
      // 光标选中当前插入位置
      // if (isFocus && this.rangeOfInputBox) {
      //   const selection = getSelection()
      //   selection.removeAllRanges()
      //   selection.addRange(this.rangeOfInputBox)
      // }
    },
    /**
     * @author 王泽
     * @time  2021-04-27
     * @param
     * @description 禁用隐藏emoji图标框
     */
    hideEmojiSelect() {
      if (this.disabled) {
        this.emojiVisible = false
      }
    },
    /**
     * @author 王泽
     * @time  2021-04-27
     * @param
     * @description 处理emoji列表数据
     */
    handleEmojiList() {
      const eachPage = 72
      const page = Math.ceil(this.emojiList.length / eachPage)
      for (let i = 0; i < page; i++) {
        this.$set(this.emojiPageList, i, this.emojiList.slice(i * eachPage, (i + 1) * eachPage))
      }
    },
    /**
     * @author 王泽
     * @time  2021-05-13
     * @param
     * @description 限制字数长度
     */
    limitLength() {
      this.isChange = true
      if (this.$refs.messagInput.innerText.length > this.maxLength) {
        // this.$refs.messagInput.innerHTML = this.$refs.messagInput.textContent.substr(0, this.maxLength)
        this.$refs.messagInput.innerHTML = this.$refs.messagInput.innerText.substr(0, this.maxLength)
        this.changeValue()
      }
      let content = this.$refs.messagInput.innerText
      // 过滤图片，处理节点换行样式
      // let content = this.handleInputNodes(this.$refs.messagInput.childNodes)
      // this.$refs.messagInput.innerHTML = content
      // this.changeValue()
      new Set(bannedWordList).forEach(item => {
        // content = content.replaceAll(item, `<span style="color:#f5222d">${item}</span>`)
        content = content.split(item).join(`<span style="color:#f5222d">${item}</span>`)
      })
      this.innerText = content
    },
    /**
     * @author 王泽
     * @time  2021-04-28
     * @param
     * @description 点击文本消息输入框 获取光标位置
     */
    handleClick(event) {
      const target = event.target;
      if (target.tagName.toLowerCase() === 'img') {
        const range = new Range();
        range.setStartBefore(target);
        // range.setStartAfter(target);
        range.collapse(true);
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(range);
      }
    },
    /**
     * @author 王泽
     * @time  2021-04-28
     * @param
     * @description 改变value值
     */
    changeValue() {
      const value = deepClone(this.$refs.messagInput.innerText)
      this.$emit('change', value)
      // this.handelBannedWord()
    },
    handleInputNodes(allnodes) {
      console.log(allnodes)
      let curText = ''
      for (let i = 0; i < allnodes.length; i++) {
        if (allnodes[i].nodeName === 'IMG' || allnodes[i].nodeName === '#comment') {
          // 不处理
        } else if (allnodes[i].nodeName === '#text') {
          // 当前节点为文字节点  textContent  wholeText
          curText += allnodes[i].textContent
        } else if (allnodes[i].nodeName === 'BR') {
          // 当前节点为换行节点
          curText += '\n'
          console.log(curText, allnodes[i].nodeName)
        } else if (allnodes[i].nodeName === 'DIV') {
          // 换行处理
          if (allnodes[i].innerText && allnodes[i].innerText.indexOf('\n') === -1) {
            curText = `${curText + allnodes[i].textContent}\n`
          } else {
            curText = `${curText + allnodes[i].textContent}`
          }
        } else {
          // 当前节点  预留直接粘贴过来为 span
          curText += allnodes[i].textContent
        }
      }
      return curText
    },
    /**
     * @author 王泽
     * @time  2021-06-09
     * @param
     * @description 处理敏感词
     */
    handelBannedWord() {
      if (!this.isValue) return;
      if (!this.$refs.messagInput.childNodes.length) return;
      clearTimeout(this.changeTimer)
      this.changeTimer = setTimeout(() => {
        let content = this.$refs.messagInput.innerText
        new Set(bannedWordList).forEach(item => {
          // content = content.replaceAll(item, `<span style="color:#f5222d">${item}</span>`)
          content = content.split(item).join(`<span style="color:#f5222d">${item}</span>`)
        })
        this.innerText = content
        setTimeout(() => {
          const edit = this.$refs.messagInput
          const startP = this.getInsertPosition(this.rangeStart)
          const endP = this.getInsertPosition(this.rangeEnd)
          const sel = document.getSelection();
          const range = document.createRange();
          range.selectNode(edit);
          range.collapse(this.rangeStart === this.rangeEnd);
          range.setStart(startP[0], startP[1]);
          range.setEnd(endP[0], endP[1]);
          sel.removeAllRanges();
          sel.addRange(range);
          this.rangeOfInputBox = sel.getRangeAt(0)
        }, 0)
      }, 300)
    },
    /**
     * @author 王泽
     * @time  2021-05-21
     * @param
     * @description 限制输入
     */
    limit(e) {
      if (![37, 38, 39, 40, 8].includes(e.keyCode) && this.$refs.messagInput.innerText.length >= this.maxLength) {
        e.preventDefault()
      }
    },
    /**
     * @author 王泽
     * @time  2021-05-13
     * @param
     * @description 获取光标位置
     */
    getEndFocus() {
      // 获取输入光标位置
      document.onselectionchange = () => {
        const selection = document.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (this.$refs.messagInput && this.$refs.messagInput.contains(range.commonAncestorContainer)) {
            this.rangeOfInputBox = range;
            if (!this.$refs.messagInput.childNodes.length) return;
            const { startContainer, endContainer, startOffset, endOffset } = range
            const startP = this.getPosition(startContainer, startOffset)
            const endP = this.getPosition(endContainer, endOffset)
            this.rangeStart = startP
            this.rangeEnd = endP
          }
        }
      };
    },
    /**
     * @author 王泽
     * @time  2021-06-07
     * @param
     * @description 获取光标位置
     */
    getPosition(container, offset) {
      const childList = Array.from(this.$refs.messagInput.childNodes)
      let position = 0
      childList.some((item) => {
        const isSame = (container === item) || (container === item.childNodes[0])
        if (isSame) {
          position += offset
        } else {
          position += item.childNodes.length ? item.childNodes[0].length : item.length
        }
        return isSame
      })
      return position
    },
    /**
     * @author 王泽
     * @time  2021-06-07
     * @param
     * @description 获取插入时的位置
     */
    getInsertPosition(rangePosition) {
      const edit = this.$refs.messagInput
      // 获取文本框的子节点个数
      const childList = Array.from(edit.childNodes)
      let len = 0
      let i = null
      let p = null
      // 获取当前位置位于的子节点
      childList.some((item, index) => {
        const length = len
        len += item.childNodes.length ? item.childNodes[0].length : item.length
        const r = len >= rangePosition
        if (r) {
          p = rangePosition - (!index ? 0 : length)
          i = index
        }
        return r
      })
      // 返回子节点及其对应的位置
      return [childList[i].childNodes.length ? childList[i].childNodes[0] : childList[i], p]
    },
    /**
     * @author 王泽
     * @time  2021-05-20
     * @param
     * @description 获取焦点获取光标位置
     */
    handelFocus() {
      this.isChange = false
      this.getEndFocus()
    },
    /**
     * @author 王泽
     * @time  2021-07-29
     * @param
     * @description 判断电脑系统
     */
    judgeSystem() {
      console.log(navigator.platform);
      const agent = navigator.userAgent.toLowerCase();
      console.log(agent);
      const isMac = /macintosh|mac os x/i.test(navigator.userAgent);
      if (agent.indexOf('win32') >= 0 || agent.indexOf('wow32') >= 0) {
        console.log('这是windows32位系统');
      }
      if (agent.indexOf('win64') >= 0 || agent.indexOf('wow64') >= 0) {
        console.log('这是windows64位系统')
      }
      if (isMac) {
        console.log('这是mac系统')
      }
      const version = navigator.userAgent;
      if (version.indexOf('Windows NT 5.0') !== -1) {
        console.log('windows 2000');
      } else if (version.indexOf('Windows NT 5.1') !== -1) {
        console.log('windows xp');
      } else if (version.indexOf('Windows NT 5.2') !== -1) {
        console.log('windows 2003');
      } else if (version.indexOf('Windows NT 6.0') !== -1) {
        console.log('windows vista');
      } else if (version.indexOf('Windows NT 6.1') !== -1) {
        console.log('windows 7');
      } else if (version.indexOf('Windows NT 6.2') !== -1) {
        console.log('windows 8');
      } else if (version.indexOf('Windows NT 10.0') !== -1) {
        console.log('windows 10');
      }
    }
  },
  mounted() {
    // 获取emoji弹窗父元素位置 用来固定弹窗位置
    this.parentNode = this.$refs.emojiBox
    this.getEndFocus()
    // this.value && this.insertEmoji(this.value)
    // document.getElementsByClassName('message-input')[0].addEventListener('compositionstart', (event) => {
    //   console.log(`start: ${event.data}`);
    //   this.isValue = false
    // });
    // document.getElementsByClassName('message-input')[0].addEventListener('compositionend', (event) => {
    //   console.log(`end: ${event.data}`);
    //   this.isValue = true
    //   this.handelBannedWord()
    // });
    // document.getElementsByClassName('message-input')[0].addEventListener('compositionupdate', (event) => {
    //   console.log(`update: ${event.data}`);
    // });
  }
}
</script>

<style lang="scss">
.has-error {
  .text-message .message-input {
    border-color: #f5222d;
    &:focus {
      border-color: #f5222d;
      box-shadow: 0 0 0 2px rgba(245,34,45,0.2);
    }
  }
}
.text-message {
  .warp-border-header {
    height: 36px;
    line-height: 36px;
    border: 1px solid #D9D9D9;
    border-radius: 4px 4px 0px 0px;
    border-bottom: 0;
    padding-left: 16px;
    .insert-text {
      color: #1AAD19;
      cursor: pointer;
      user-select: none;
    }
    .insert-text + .insert-text {
      margin: 0px 5px;
    }
  }
  .warp-border-footer {
    // height: 36px;
    line-height: 36px;
    border: 1px solid #D9D9D9;
    border-radius: 0px 0px 4px 4px;
    border-top: 0;
    background-color: #f7f7f7;
    // padding-left: 16px;
  }
  .ant-input-affix-wrapper {
    vertical-align: middle;
    textarea.ant-input {
      margin-bottom: 0px;
    }
  }
  .warp-border-context {
    ::v-deep .ant-input {
      border-radius: 0 0 4px 4px;
    }
  }
  .message-input {
    background-color: #fff;
    padding: 10px 10px 20px;
    min-height: 100px;
    line-height: 24px;
    letter-spacing: 1px;
    border: 1px solid #ccc;
    color: rgba(0,0,0,.85);
    z-index: 2;
    white-space: pre-line;
    word-wrap: break-word;
    border-radius: 2px;
    * {
      white-space: initial!important;
    }
    &.disabled{
      color: rgba(0, 0, 0, 0.25);
      background-color: #f5f5f5;
      cursor: not-allowed;
      opacity: 1;
    }
    &:focus-visible {
      // outline: #1D61EF auto 1px;
      outline: 0;
    }
    &:focus {
      border-color: #4786fc;
      border-right-width: 1px !important;
      outline: 0;
      box-shadow: 0 0 0 2px rgba(29,97,239,0.2);
      // border-radius: 4px;
    }
    &:empty:before{
      // 模拟palceholder
      content: attr(placeholder);
      color: #999999;
      font-size: 14px;
    }
    // &:focus:before{
    //   // 模拟palceholder 聚焦
    //   content: none;
    // }
  }
  .icon-emoji {
    font-size: 18px;
    color: rgba(0,0,0,.45);
    margin-left: 16px;
    cursor: pointer;
    user-select: none;
    &.icon-emoji_disabled {
      cursor: not-allowed;
      &:active {
        color: rgba(0,0,0,.45);
      }
    }
    &:active {
      color: rgba(0,0,0,.85)
    }
  }
  .emoji-page {
    padding-bottom: 10px;
  }
  .emoji-content {
    // background-color: #3a4d76;
    // width: 400px;
    width: 360px;
    height: 340px;
    overflow: hidden;
  }
  .carousel-circle {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: #e5e5e5;
  }
  .slick-active {
    .carousel-circle {
      background-color: #b2b2b2;
    }
  }
  .emoji-item {
    display: inline-block;
    width: 40px;
    height: 40px;
    // width: 30px;
    // height: 30px;
    // margin: 5px;
    line-height: 40px;
    text-align: center;
    font-size: 22px;
    color: #000;
    border-radius: 5px;
    user-select: none;
    cursor: pointer;
    &:hover {
      background-color: #efefef;
    }
    // img {
    //   display: inline-block;
    //   width: 25px;
    //   height: 25px;
    //   vertical-align: middle;
    // }
  }
  .message-input_container {
    position: relative;
  }
  .input-limit {
    position: absolute;
    bottom: -10px;
    right: 10px;
    font-size: 12px;
    user-select: none;
    line-height: 40px;
  }
  .exchange-code {
    position: absolute;
    top: 3px;
    left: 10px;
    letter-spacing: 1px;
    color: rgb(21, 163, 21);
    font-size: 14px;
  }
  .input-limit_beyond {
    color: #f5222d;
  }
  .banned-word_container {
    padding: 8px 16px;
    border-top: 1px solid #D9D9D9;
    line-height: 20px;
  }
  .banned-word {
    color: #f5222d;
  }
}
</style>
