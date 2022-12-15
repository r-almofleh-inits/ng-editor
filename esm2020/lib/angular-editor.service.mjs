import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import * as i0 from "@angular/core";
import * as i1 from "@angular/common/http";
export class AngularEditorService {
    constructor(http, doc) {
        this.http = http;
        this.doc = doc;
        /**
         * save selection when the editor is focussed out
         */
        this.saveSelection = () => {
            if (this.doc.getSelection) {
                const sel = this.doc.getSelection();
                if (sel.getRangeAt && sel.rangeCount) {
                    this.savedSelection = sel.getRangeAt(0);
                    this.selectedText = sel.toString();
                }
            }
            else if (this.doc.getSelection && this.doc.createRange) {
                this.savedSelection = document.createRange();
            }
            else {
                this.savedSelection = null;
            }
        };
    }
    /**
     * Executed command from editor header buttons exclude toggleEditorMode
     * @param command string from triggerCommand
     * @param value
     */
    executeCommand(command, value) {
        const commands = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre'];
        if (commands.includes(command)) {
            this.doc.execCommand('formatBlock', false, command);
            return;
        }
        this.doc.execCommand(command, false, value);
    }
    /**
     *
     * @param url
     * @param target
     */
    createLink(url, target) {
        const newUrl = '<a href="' + url + '" target="' + target + '">' + this.selectedText + '</a>';
        if (!url.includes('http')) {
            this.doc.execCommand('insertHTML', false, newUrl);
        }
        else {
            this.insertHtml(newUrl);
        }
    }
    /**
     * insert color either font or background
     *
     * @param color color to be inserted
     * @param where where the color has to be inserted either text/background
     */
    insertColor(color, where) {
        const restored = this.restoreSelection();
        if (restored) {
            if (where === 'textColor') {
                this.doc.execCommand('foreColor', false, color);
            }
            else {
                this.doc.execCommand('hiliteColor', false, color);
            }
        }
    }
    /**
     * Set font name
     * @param fontName string
     */
    setFontName(fontName) {
        this.doc.execCommand('fontName', false, fontName);
    }
    /**
     * Set font size
     * @param fontSize string
     */
    setFontSize(fontSize) {
        this.doc.execCommand('fontSize', false, fontSize);
    }
    /**
     * Create raw HTML
     * @param html HTML string
     */
    insertHtml(html) {
        const isHTMLInserted = this.doc.execCommand('insertHTML', false, html);
        if (!isHTMLInserted) {
            throw new Error('Unable to perform the operation');
        }
    }
    /**
     * restore selection when the editor is focused in
     *
     * saved selection when the editor is focused out
     */
    restoreSelection() {
        if (this.savedSelection) {
            if (this.doc.getSelection) {
                const sel = this.doc.getSelection();
                sel.removeAllRanges();
                sel.addRange(this.savedSelection);
                return true;
            }
            else if (this.doc.getSelection /*&& this.savedSelection.select*/) {
                // this.savedSelection.select();
                return true;
            }
        }
        else {
            return false;
        }
    }
    /**
     * setTimeout used for execute 'saveSelection' method in next event loop iteration
     */
    executeInNextQueueIteration(callbackFn, timeout = 1e2) {
        setTimeout(callbackFn, timeout);
    }
    /** check any selection is made or not */
    checkSelection() {
        const selectedText = this.savedSelection.toString();
        if (selectedText.length === 0) {
            throw new Error('No Selection Made');
        }
        return true;
    }
    /**
     * Upload file to uploadUrl
     * @param file The file
     */
    uploadImage(file) {
        const uploadData = new FormData();
        uploadData.append('file', file, file.name);
        return this.http.post(this.uploadUrl, uploadData, {
            reportProgress: true,
            observe: 'events',
            withCredentials: this.uploadWithCredentials,
        });
    }
    /**
     * Insert image with Url
     * @param imageUrl The imageUrl.
     */
    insertImage(imageUrl) {
        this.doc.execCommand('insertImage', false, imageUrl);
    }
    setDefaultParagraphSeparator(separator) {
        this.doc.execCommand('defaultParagraphSeparator', false, separator);
    }
    createCustomClass(customClass) {
        let newTag = this.selectedText;
        if (customClass) {
            const tagName = customClass.tag ? customClass.tag : 'span';
            newTag = '<' + tagName + ' class="' + customClass.class + '">' + this.selectedText + '</' + tagName + '>';
        }
        this.insertHtml(newTag);
    }
    insertVideo(videoUrl) {
        if (videoUrl.match('www.youtube.com')) {
            this.insertYouTubeVideoTag(videoUrl);
        }
        if (videoUrl.match('vimeo.com')) {
            this.insertVimeoVideoTag(videoUrl);
        }
    }
    insertYouTubeVideoTag(videoUrl) {
        const id = videoUrl.split('v=')[1];
        const imageUrl = `https://img.youtube.com/vi/${id}/0.jpg`;
        const thumbnail = `
      <div style='position: relative'>
        <a href='${videoUrl}' target='_blank'>
          <img src="${imageUrl}" alt="click to watch"/>
          <img style='position: absolute; left:200px; top:140px'
          src="https://img.icons8.com/color/96/000000/youtube-play.png"/>
        </a>
      </div>`;
        this.insertHtml(thumbnail);
    }
    insertVimeoVideoTag(videoUrl) {
        const sub = this.http.get(`https://vimeo.com/api/oembed.json?url=${videoUrl}`).subscribe(data => {
            const imageUrl = data.thumbnail_url_with_play_button;
            const thumbnail = `<div>
        <a href='${videoUrl}' target='_blank'>
          <img src="${imageUrl}" alt="${data.title}"/>
        </a>
      </div>`;
            this.insertHtml(thumbnail);
            sub.unsubscribe();
        });
    }
    nextNode(node) {
        if (node.hasChildNodes()) {
            return node.firstChild;
        }
        else {
            while (node && !node.nextSibling) {
                node = node.parentNode;
            }
            if (!node) {
                return null;
            }
            return node.nextSibling;
        }
    }
    getRangeSelectedNodes(range, includePartiallySelectedContainers) {
        let node = range.startContainer;
        const endNode = range.endContainer;
        let rangeNodes = [];
        // Special case for a range that is contained within a single node
        if (node === endNode) {
            rangeNodes = [node];
        }
        else {
            // Iterate nodes until we hit the end container
            while (node && node !== endNode) {
                rangeNodes.push(node = this.nextNode(node));
            }
            // Add partially selected nodes at the start of the range
            node = range.startContainer;
            while (node && node !== range.commonAncestorContainer) {
                rangeNodes.unshift(node);
                node = node.parentNode;
            }
        }
        // Add ancestors of the range container, if required
        if (includePartiallySelectedContainers) {
            node = range.commonAncestorContainer;
            while (node) {
                rangeNodes.push(node);
                node = node.parentNode;
            }
        }
        return rangeNodes;
    }
    getSelectedNodes() {
        const nodes = [];
        if (this.doc.getSelection) {
            const sel = this.doc.getSelection();
            for (let i = 0, len = sel.rangeCount; i < len; ++i) {
                nodes.push.apply(nodes, this.getRangeSelectedNodes(sel.getRangeAt(i), true));
            }
        }
        return nodes;
    }
    replaceWithOwnChildren(el) {
        const parent = el.parentNode;
        while (el.hasChildNodes()) {
            parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
    }
    removeSelectedElements(tagNames) {
        const tagNamesArray = tagNames.toLowerCase().split(',');
        this.getSelectedNodes().forEach((node) => {
            if (node.nodeType === 1 &&
                tagNamesArray.indexOf(node.tagName.toLowerCase()) > -1) {
                // Remove the node and replace it with its children
                this.replaceWithOwnChildren(node);
            }
        });
    }
}
AngularEditorService.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.3.11", ngImport: i0, type: AngularEditorService, deps: [{ token: i1.HttpClient }, { token: DOCUMENT }], target: i0.ɵɵFactoryTarget.Injectable });
AngularEditorService.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "13.3.11", ngImport: i0, type: AngularEditorService });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.3.11", ngImport: i0, type: AngularEditorService, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: i1.HttpClient }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [DOCUMENT]
                }] }]; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5ndWxhci1lZGl0b3Iuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2FuZ3VsYXItZWRpdG9yL3NyYy9saWIvYW5ndWxhci1lZGl0b3Iuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUMsTUFBTSxFQUFFLFVBQVUsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUdqRCxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0saUJBQWlCLENBQUM7OztBQVF6QyxNQUFNLE9BQU8sb0JBQW9CO0lBTy9CLFlBQ1UsSUFBZ0IsRUFDRSxHQUFRO1FBRDFCLFNBQUksR0FBSixJQUFJLENBQVk7UUFDRSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBOEVwQzs7V0FFRztRQUNJLGtCQUFhLEdBQUcsR0FBUyxFQUFFO1lBQ2hDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUU7Z0JBQ3pCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3BDLElBQUksR0FBRyxDQUFDLFVBQVUsSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFO29CQUNwQyxJQUFJLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3hDLElBQUksQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO2lCQUNwQzthQUNGO2lCQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUU7Z0JBQ3hELElBQUksQ0FBQyxjQUFjLEdBQUcsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQzlDO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO2FBQzVCO1FBQ0gsQ0FBQyxDQUFBO0lBNUZHLENBQUM7SUFFTDs7OztPQUlHO0lB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QUUsQ0FBQyxhQUFhLEVBQUUsRUFBRTtZQUN6QixNQUFNLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDeEM7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxRQUFRO1FBQzdCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDdkMsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLENBQUM7Z0JBQ3JCLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO2dCQUN4RCxtREFBbUQ7Z0JBQ25ELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNuQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7a0hBclNVLG9CQUFvQiw0Q0FTckIsUUFBUTtzSEFUUCxvQkFBb0I7NEZBQXBCLG9CQUFvQjtrQkFEaEMsVUFBVTs7MEJBVU4sTUFBTTsyQkFBQyxRQUFRIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJbmplY3QsIEluamVjdGFibGV9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtIdHRwQ2xpZW50LCBIdHRwRXZlbnR9IGZyb20gJ0Bhbmd1bGFyL2NvbW1vbi9odHRwJztcbmltcG9ydCB7T2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge0RPQ1VNRU5UfSBmcm9tICdAYW5ndWxhci9jb21tb24nO1xuaW1wb3J0IHtDdXN0b21DbGFzc30gZnJvbSAnLi9jb25maWcnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFVwbG9hZFJlc3BvbnNlIHtcbiAgaW1hZ2VVcmw6IHN0cmluZztcbn1cblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIEFuZ3VsYXJFZGl0b3JTZXJ2aWNlIHtcblxuICBzYXZlZFNlbGVjdGlvbjogUmFuZ2UgfCBudWxsO1xuICBzZWxlY3RlZFRleHQ6IHN0cmluZztcbiAgdXBsb2FkVXJsOiBzdHJpbmc7XG4gIHVwbG9hZFdpdGhDcmVkZW50aWFsczogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIGh0dHA6IEh0dHBDbGllbnQsXG4gICAgQEluamVjdChET0NVTUVOVCkgcHJpdmF0ZSBkb2M6IGFueVxuICApIHsgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlZCBjb21tYW5kIGZyb20gZWRpdG9yIGhlYWRlciBidXR0b25zIGV4Y2x1ZGUgdG9nZ2xlRWRpdG9yTW9kZVxuICAgKiBAcGFyYW0gY29tbWFuZCBzdHJpbmcgZnJvbSB0cmlnZ2VyQ29tbWFuZFxuICAgKiBAcGFyYW0gdmFsdWVcbiAgICovXG4gIGV4ZWN1dGVDb21tYW5kKGNvbW1hbmQ6IHN0cmluZywgdmFsdWU/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb21tYW5kcyA9IFsnaDEnLCAnaDInLCAnaDMnLCAnaDQnLCAnaDUnLCAnaDYnLCAncCcsICdwcmUnXTtcbiAgICBpZiAoY29tbWFuZHMuaW5jbHVkZXMoY29tbWFuZCkpIHtcbiAgICAgIHRoaXMuZG9jLmV4ZWNDb21tYW5kKCdmb3JtYXRCbG9jaycsIGZhbHNlLCBjb21tYW5kKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5kb2MuZXhlY0NvbW1hbmQoY29tbWFuZCwgZmFsc2UsIHZhbHVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKlxuICAgKiBAcGFyYW0gdXJsXG4gICAqIEBwYXJhbSB0YXJnZXRcbiAgICovXG4gIGNyZWF0ZUxpbmsodXJsOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKSB7XG4gICAgY29uc3QgbmV3VXJsID0gJzxhIGhyZWY9XCInICsgdXJsICsgJ1wiIHRhcmdldD1cIicgKyB0YXJnZXQgKyAnXCI+JyArIHRoaXMuc2VsZWN0ZWRUZXh0ICsgJzwvYT4nO1xuXG4gICAgaWYgKCF1cmwuaW5jbHVkZXMoJ2h0dHAnKSkge1xuICAgICAgdGhpcy5kb2MuZXhlY0NvbW1hbmQoJ2luc2VydEhUTUwnLCBmYWxzZSwgbmV3VXJsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbnNlcnRIdG1sKG5ld1VybCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIGluc2VydCBjb2xvciBlaXRoZXIgZm9udCBvciBiYWNrZ3JvdW5kXG4gICAqXG4gICAqIEBwYXJhbSBjb2xvciBjb2xvciB0byBiZSBpbnNlcnRlZFxuICAgKiBAcGFyYW0gd2hlcmUgd2hlcmUgdGhlIGNvbG9yIGhhcyB0byBiZSBpbnNlcnRlZCBlaXRoZXIgdGV4dC9iYWNrZ3JvdW5kXG4gICAqL1xuICBpbnNlcnRDb2xvcihjb2xvcjogc3RyaW5nLCB3aGVyZTogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgcmVzdG9yZWQgPSB0aGlzLnJlc3RvcmVTZWxlY3Rpb24oKTtcbiAgICBpZiAocmVzdG9yZWQpIHtcbiAgICAgIGlmICh3aGVyZSA9PT0gJ3RleHRDb2xvcicpIHtcbiAgICAgICAgdGhpcy5kb2MuZXhlY0NvbW1hbmQoJ2ZvcmVDb2xvcicsIGZhbHNlLCBjb2xvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmRvYy5leGVjQ29tbWFuZCgnaGlsaXRlQ29sb3InLCBmYWxzZSwgY29sb3IpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgZm9udCBuYW1lXG4gICAqIEBwYXJhbSBmb250TmFtZSBzdHJpbmdcbiAgICovXG4gIHNldEZvbnROYW1lKGZvbnROYW1lOiBzdHJpbmcpIHtcbiAgICB0aGlzLmRvYy5leGVjQ29tbWFuZCgnZm9udE5hbWUnLCBmYWxzZSwgZm9udE5hbWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCBmb250IHNpemVcbiAgICogQHBhcmFtIGZvbnRTaXplIHN0cmluZ1xuICAgKi9cbiAgc2V0Rm9udFNpemUoZm9udFNpemU6IHN0cmluZykge1xuICAgIHRoaXMuZG9jLmV4ZWNDb21tYW5kKCdmb250U2l6ZScsIGZhbHNlLCBmb250U2l6ZSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIHJhdyBIVE1MXG4gICAqIEBwYXJhbSBodG1sIEhUTUwgc3RyaW5nXG4gICAqL1xuICBpbnNlcnRIdG1sKGh0bWw6IHN0cmluZyk6IHZvaWQge1xuXG4gICAgY29uc3QgaXNIVE1MSW5zZXJ0ZWQgPSB0aGlzLmRvYy5leGVjQ29tbWFuZCgnaW5zZXJ0SFRNTCcsIGZhbHNlLCBodG1sKTtcblxuICAgIGlmICghaXNIVE1MSW5zZXJ0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHBlcmZvcm0gdGhlIG9wZXJhdGlvbicpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBzYXZlIHNlbGVjdGlvbiB3aGVuIHRoZSBlZGl0b3IgaXMgZm9jdXNzZWQgb3V0XG4gICAqL1xuICBwdWJsaWMgc2F2ZVNlbGVjdGlvbiA9ICgpOiB2b2lkID0+IHtcbiAgICBpZiAodGhpcy5kb2MuZ2V0U2VsZWN0aW9uKSB7XG4gICAgICBjb25zdCBzZWwgPSB0aGlzLmRvYy5nZXRTZWxlY3Rpb24oKTtcbiAgICAgIGlmIChzZWwuZ2V0UmFuZ2VBdCAmJiBzZWwucmFuZ2VDb3VudCkge1xuICAgICAgICB0aGlzLnNhdmVkU2VsZWN0aW9uID0gc2VsLmdldFJhbmdlQXQoMCk7XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRUZXh0ID0gc2VsLnRvU3RyaW5nKCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmRvYy5nZXRTZWxlY3Rpb24gJiYgdGhpcy5kb2MuY3JlYXRlUmFuZ2UpIHtcbiAgICAgIHRoaXMuc2F2ZWRTZWxlY3Rpb24gPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNhdmVkU2VsZWN0aW9uID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogcmVzdG9yZSBzZWxlY3Rpb24gd2hlbiB0aGUgZWRpdG9yIGlzIGZvY3VzZWQgaW5cbiAgICpcbiAgICogc2F2ZWQgc2VsZWN0aW9uIHdoZW4gdGhlIGVkaXRvciBpcyBmb2N1c2VkIG91dFxuICAgKi9cbiAgcmVzdG9yZVNlbGVjdGlvbigpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5zYXZlZFNlbGVjdGlvbikge1xuICAgICAgaWYgKHRoaXMuZG9jLmdldFNlbGVjdGlvbikge1xuICAgICAgICBjb25zdCBzZWwgPSB0aGlzLmRvYy5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgc2VsLnJlbW92ZUFsbFJhbmdlcygpO1xuICAgICAgICBzZWwuYWRkUmFuZ2UodGhpcy5zYXZlZFNlbGVjdGlvbik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmRvYy5nZXRTZWxlY3Rpb24gLyomJiB0aGlzLnNhdmVkU2VsZWN0aW9uLnNlbGVjdCovKSB7XG4gICAgICAgIC8vIHRoaXMuc2F2ZWRTZWxlY3Rpb24uc2VsZWN0KCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIHNldFRpbWVvdXQgdXNlZCBmb3IgZXhlY3V0ZSAnc2F2ZVNlbGVjdGlvbicgbWV0aG9kIGluIG5leHQgZXZlbnQgbG9vcCBpdGVyYXRpb25cbiAgICovXG4gIHB1YmxpYyBleGVjdXRlSW5OZXh0UXVldWVJdGVyYXRpb24oY2FsbGJhY2tGbjogKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnksIHRpbWVvdXQgPSAxZTIpOiB2b2lkIHtcbiAgICBzZXRUaW1lb3V0KGNhbGxiYWNrRm4sIHRpbWVvdXQpO1xuICB9XG5cbiAgLyoqIGNoZWNrIGFueSBzZWxlY3Rpb24gaXMgbWFkZSBvciBub3QgKi9cbiAgcHJpdmF0ZSBjaGVja1NlbGVjdGlvbigpOiBhbnkge1xuXG4gICAgY29uc3Qgc2VsZWN0ZWRUZXh0ID0gdGhpcy5zYXZlZFNlbGVjdGlvbi50b1N0cmluZygpO1xuXG4gICAgaWYgKHNlbGVjdGVkVGV4dC5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gU2VsZWN0aW9uIE1hZGUnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogVXBsb2FkIGZpbGUgdG8gdXBsb2FkVXJsXG4gICAqIEBwYXJhbSBmaWxlIFRoZSBmaWxlXG4gICAqL1xuICB1cGxvYWRJbWFnZShmaWxlOiBGaWxlKTogT2JzZXJ2YWJsZTxIdHRwRXZlbnQ8VXBsb2FkUmVzcG9uc2U+PiB7XG5cbiAgICBjb25zdCB1cGxvYWREYXRhOiBGb3JtRGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXG4gICAgdXBsb2FkRGF0YS5hcHBlbmQoJ2ZpbGUnLCBmaWxlLCBmaWxlLm5hbWUpO1xuXG4gICAgcmV0dXJuIHRoaXMuaHR0cC5wb3N0PFVwbG9hZFJlc3BvbnNlPih0aGlzLnVwbG9hZFVybCwgdXBsb2FkRGF0YSwge1xuICAgICAgcmVwb3J0UHJvZ3Jlc3M6IHRydWUsXG4gICAgICBvYnNlcnZlOiAnZXZlbnRzJyxcbiAgICAgIHdpdGhDcmVkZW50aWFsczogdGhpcy51cGxvYWRXaXRoQ3JlZGVudGlhbHMsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5zZXJ0IGltYWdlIHdpdGggVXJsXG4gICAqIEBwYXJhbSBpbWFnZVVybCBUaGUgaW1hZ2VVcmwuXG4gICAqL1xuICBpbnNlcnRJbWFnZShpbWFnZVVybDogc3RyaW5nKSB7XG4gICAgdGhpcy5kb2MuZXhlY0NvbW1hbmQoJ2luc2VydEltYWdlJywgZmFsc2UsIGltYWdlVXJsKTtcbiAgfVxuXG4gIHNldERlZmF1bHRQYXJhZ3JhcGhTZXBhcmF0b3Ioc2VwYXJhdG9yOiBzdHJpbmcpIHtcbiAgICB0aGlzLmRvYy5leGVjQ29tbWFuZCgnZGVmYXVsdFBhcmFncmFwaFNlcGFyYXRvcicsIGZhbHNlLCBzZXBhcmF0b3IpO1xuICB9XG5cbiAgY3JlYXRlQ3VzdG9tQ2xhc3MoY3VzdG9tQ2xhc3M6IEN1c3RvbUNsYXNzKSB7XG4gICAgbGV0IG5ld1RhZyA9IHRoaXMuc2VsZWN0ZWRUZXh0O1xuICAgIGlmIChjdXN0b21DbGFzcykge1xuICAgICAgY29uc3QgdGFnTmFtZSA9IGN1c3RvbUNsYXNzLnRhZyA/IGN1c3RvbUNsYXNzLnRhZyA6ICdzcGFuJztcbiAgICAgIG5ld1RhZyA9ICc8JyArIHRhZ05hbWUgKyAnIGNsYXNzPVwiJyArIGN1c3RvbUNsYXNzLmNsYXNzICsgJ1wiPicgKyB0aGlzLnNlbGVjdGVkVGV4dCArICc8LycgKyB0YWdOYW1lICsgJz4nO1xuICAgIH1cbiAgICB0aGlzLmluc2VydEh0bWwobmV3VGFnKTtcbiAgfVxuXG4gIGluc2VydFZpZGVvKHZpZGVvVXJsOiBzdHJpbmcpIHtcbiAgICBpZiAodmlkZW9VcmwubWF0Y2goJ3d3dy55b3V0dWJlLmNvbScpKSB7XG4gICAgICB0aGlzLmluc2VydFlvdVR1YmVWaWRlb1RhZyh2aWRlb1VybCk7XG4gICAgfVxuICAgIGlmICh2aWRlb1VybC5tYXRjaCgndmltZW8uY29tJykpIHtcbiAgICAgIHRoaXMuaW5zZXJ0VmltZW9WaWRlb1RhZyh2aWRlb1VybCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBpbnNlcnRZb3VUdWJlVmlkZW9UYWcodmlkZW9Vcmw6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGlkID0gdmlkZW9Vcmwuc3BsaXQoJ3Y9JylbMV07XG4gICAgY29uc3QgaW1hZ2VVcmwgPSBgaHR0cHM6Ly9pbWcueW91dHViZS5jb20vdmkvJHtpZH0vMC5qcGdgO1xuICAgIGNvbnN0IHRodW1ibmFpbCA9IGBcbiAgICAgIDxkaXYgc3R5bGU9J3Bvc2l0aW9uOiByZWxhdGl2ZSc+XG4gICAgICAgIDxhIGhyZWY9JyR7dmlkZW9Vcmx9JyB0YXJnZXQ9J19ibGFuayc+XG4gICAgICAgICAgPGltZyBzcmM9XCIke2ltYWdlVXJsfVwiIGFsdD1cImNsaWNrIHRvIHdhdGNoXCIvPlxuICAgICAgICAgIDxpbWcgc3R5bGU9J3Bvc2l0aW9uOiBhYnNvbHV0ZTsgbGVmdDoyMDBweDsgdG9wOjE0MHB4J1xuICAgICAgICAgIHNyYz1cImh0dHBzOi8vaW1nLmljb25zOC5jb20vY29sb3IvOTYvMDAwMDAwL3lvdXR1YmUtcGxheS5wbmdcIi8+XG4gICAgICAgIDwvYT5cbiAgICAgIDwvZGl2PmA7XG4gICAgdGhpcy5pbnNlcnRIdG1sKHRodW1ibmFpbCk7XG4gIH1cblxuICBwcml2YXRlIGluc2VydFZpbWVvVmlkZW9UYWcodmlkZW9Vcmw6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IHN1YiA9IHRoaXMuaHR0cC5nZXQ8YW55PihgaHR0cHM6Ly92aW1lby5jb20vYXBpL29lbWJlZC5qc29uP3VybD0ke3ZpZGVvVXJsfWApLnN1YnNjcmliZShkYXRhID0+IHtcbiAgICAgIGNvbnN0IGltYWdlVXJsID0gZGF0YS50aHVtYm5haWxfdXJsX3dpdGhfcGxheV9idXR0b247XG4gICAgICBjb25zdCB0aHVtYm5haWwgPSBgPGRpdj5cbiAgICAgICAgPGEgaHJlZj0nJHt2aWRlb1VybH0nIHRhcmdldD0nX2JsYW5rJz5cbiAgICAgICAgICA8aW1nIHNyYz1cIiR7aW1hZ2VVcmx9XCIgYWx0PVwiJHtkYXRhLnRpdGxlfVwiLz5cbiAgICAgICAgPC9hPlxuICAgICAgPC9kaXY+YDtcbiAgICAgIHRoaXMuaW5zZXJ0SHRtbCh0aHVtYm5haWwpO1xuICAgICAgc3ViLnVuc3Vic2NyaWJlKCk7XG4gICAgfSk7XG4gIH1cblxuICBuZXh0Tm9kZShub2RlKSB7XG4gICAgaWYgKG5vZGUuaGFzQ2hpbGROb2RlcygpKSB7XG4gICAgICByZXR1cm4gbm9kZS5maXJzdENoaWxkO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aGlsZSAobm9kZSAmJiAhbm9kZS5uZXh0U2libGluZykge1xuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgICAgfVxuICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5vZGUubmV4dFNpYmxpbmc7XG4gICAgfVxuICB9XG5cbiAgZ2V0UmFuZ2VTZWxlY3RlZE5vZGVzKHJhbmdlLCBpbmNsdWRlUGFydGlhbGx5U2VsZWN0ZWRDb250YWluZXJzKSB7XG4gICAgbGV0IG5vZGUgPSByYW5nZS5zdGFydENvbnRhaW5lcjtcbiAgICBjb25zdCBlbmROb2RlID0gcmFuZ2UuZW5kQ29udGFpbmVyO1xuICAgIGxldCByYW5nZU5vZGVzID0gW107XG5cbiAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIGEgcmFuZ2UgdGhhdCBpcyBjb250YWluZWQgd2l0aGluIGEgc2luZ2xlIG5vZGVcbiAgICBpZiAobm9kZSA9PT0gZW5kTm9kZSkge1xuICAgICAgcmFuZ2VOb2RlcyA9IFtub2RlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSXRlcmF0ZSBub2RlcyB1bnRpbCB3ZSBoaXQgdGhlIGVuZCBjb250YWluZXJcbiAgICAgIHdoaWxlIChub2RlICYmIG5vZGUgIT09IGVuZE5vZGUpIHtcbiAgICAgICAgcmFuZ2VOb2Rlcy5wdXNoKCBub2RlID0gdGhpcy5uZXh0Tm9kZShub2RlKSApO1xuICAgICAgfVxuXG4gICAgICAvLyBBZGQgcGFydGlhbGx5IHNlbGVjdGVkIG5vZGVzIGF0IHRoZSBzdGFydCBvZiB0aGUgcmFuZ2VcbiAgICAgIG5vZGUgPSByYW5nZS5zdGFydENvbnRhaW5lcjtcbiAgICAgIHdoaWxlIChub2RlICYmIG5vZGUgIT09IHJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKSB7XG4gICAgICAgIHJhbmdlTm9kZXMudW5zaGlmdChub2RlKTtcbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgYW5jZXN0b3JzIG9mIHRoZSByYW5nZSBjb250YWluZXIsIGlmIHJlcXVpcmVkXG4gICAgaWYgKGluY2x1ZGVQYXJ0aWFsbHlTZWxlY3RlZENvbnRhaW5lcnMpIHtcbiAgICAgIG5vZGUgPSByYW5nZS5jb21tb25BbmNlc3RvckNvbnRhaW5lcjtcbiAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgIHJhbmdlTm9kZXMucHVzaChub2RlKTtcbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2VOb2RlcztcbiAgfVxuXG4gIGdldFNlbGVjdGVkTm9kZXMoKSB7XG4gICAgY29uc3Qgbm9kZXMgPSBbXTtcbiAgICBpZiAodGhpcy5kb2MuZ2V0U2VsZWN0aW9uKSB7XG4gICAgICBjb25zdCBzZWwgPSB0aGlzLmRvYy5nZXRTZWxlY3Rpb24oKTtcbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBzZWwucmFuZ2VDb3VudDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIG5vZGVzLnB1c2guYXBwbHkobm9kZXMsIHRoaXMuZ2V0UmFuZ2VTZWxlY3RlZE5vZGVzKHNlbC5nZXRSYW5nZUF0KGkpLCB0cnVlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub2RlcztcbiAgfVxuXG4gIHJlcGxhY2VXaXRoT3duQ2hpbGRyZW4oZWwpIHtcbiAgICBjb25zdCBwYXJlbnQgPSBlbC5wYXJlbnROb2RlO1xuICAgIHdoaWxlIChlbC5oYXNDaGlsZE5vZGVzKCkpIHtcbiAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoZWwuZmlyc3RDaGlsZCwgZWwpO1xuICAgIH1cbiAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoZWwpO1xuICB9XG5cbiAgcmVtb3ZlU2VsZWN0ZWRFbGVtZW50cyh0YWdOYW1lcykge1xuICAgIGNvbnN0IHRhZ05hbWVzQXJyYXkgPSB0YWdOYW1lcy50b0xvd2VyQ2FzZSgpLnNwbGl0KCcsJyk7XG4gICAgdGhpcy5nZXRTZWxlY3RlZE5vZGVzKCkuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgICAgaWYgKG5vZGUubm9kZVR5cGUgPT09IDEgJiZcbiAgICAgICAgdGFnTmFtZXNBcnJheS5pbmRleE9mKG5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSA+IC0xKSB7XG4gICAgICAgIC8vIFJlbW92ZSB0aGUgbm9kZSBhbmQgcmVwbGFjZSBpdCB3aXRoIGl0cyBjaGlsZHJlblxuICAgICAgICB0aGlzLnJlcGxhY2VXaXRoT3duQ2hpbGRyZW4obm9kZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==