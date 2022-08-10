import { withPluginApi } from "discourse/lib/plugin-api";
import showModal from "discourse/lib/show-modal";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import Site from "discourse/models/site";

export const CREATE_TOPIC = "createTopic",
  CREATE_SHARED_DRAFT = "createSharedDraft",
  EDIT_SHARED_DRAFT = "editSharedDraft",
  PRIVATE_MESSAGE = "privateMessage",
  REPLY = "reply",
  EDIT = "edit",
  NEW_PRIVATE_MESSAGE_KEY = "new_private_message",
  NEW_TOPIC_KEY = "new_topic";


const CLOSED = "closed",
SAVING = "saving",
OPEN = "open",
DRAFT = "draft",
FULLSCREEN = "fullscreen",
// When creating, these fields are moved into the post model from the composer model
_create_serializer = {
  raw: "reply",
  title: "title",
  unlist_topic: "unlistTopic",
  category: "categoryId",
  topic_id: "topic.id",
  is_warning: "isWarning",
  whisper: "whisper",
  archetype: "archetypeId",
  target_recipients: "targetRecipients",
  typing_duration_msecs: "typingTime",
  composer_open_duration_msecs: "composerTime",
  tags: "tags",
  featured_link: "featuredLink",
  shared_draft: "sharedDraft",
  no_bump: "noBump",
  draft_key: "draftKey",
},
_update_serializer = {
  raw: "reply",
  topic_id: "topic.id",
  raw_old: "rawOld",
},
_edit_topic_serializer = {
  title: "topic.title",
  categoryId: "topic.category.id",
  tags: "topic.tags",
  featuredLink: "topic.featured_link",
},
_draft_serializer = {
  reply: "reply",
  action: "action",
  title: "title",
  categoryId: "categoryId",
  tags: "tags",
  archetypeId: "archetypeId",
  whisper: "whisper",
  metaData: "metaData",
  composerTime: "composerTime",
  typingTime: "typingTime",
  postId: "post.id",
  recipients: "targetRecipients",
},
_add_draft_fields = {},
FAST_REPLY_LENGTH_THRESHOLD = 10000;

function autoShowModal(currentUser) {
  
  const params = new URLSearchParams(window.location.search)
  let topicId = params.get('topic-id');
  let topicSlug = params.get('topic-slug');
  let isShowModal = params.get('show-modal');
  if(topicId && topicSlug && isShowModal == 'true')
  ajax(`/t/${topicSlug}/${topicId}`, {
    dataType: "json",
    type: "GET"
  })
  .then(topic_detail => {
    const topicDetail = topic_detail.post_stream.posts[0] || {};
      const liked = topic_detail.liked ? "liked" : "";
      const commentsList = topicDetail.comments ? (topicDetail.comments.reverse() || []) : [];
      
      commentsList.map(cm => {
        if(!cm.name || cm.name.trim() == "") cm.name = cm.username;
        return cm;
      })

      const limitComment = 1;
      const countComment = commentsList.length;
      let lastComments = [];
      let hideComments = [];
      if (commentsList.length <= limitComment) {
        lastComments = commentsList;
      } else {
        lastComments = commentsList.slice(countComment - limitComment);
        hideComments = commentsList.slice(0, countComment - limitComment);
      }

      let modalTopic = showModal("topic-detail-selector");
      let poster = topic_detail.post_stream.posts[0];
      
      topic_detail.creator = {
        id: poster.user_id,
        avatar_template: poster.avatar_template,
        name: poster.name,
        username: poster.username
      }
      modalTopic.setProperties({
        topicDetail: topicDetail,
        lastComments: commentsList,
        hideComments: hideComments,
        countComment: topic_detail.comment_count,
        topic: topic_detail,
        user: currentUser,
        liked: liked,
        post: undefined,
        topic_detail: topic_detail,
        more_comment: topic_detail.comment_count <= 3 ? false : true
      });
  })
}

function initializeClickTopic(api) {
  
  autoShowModal(api.getCurrentUser())
  api.modifyClass("component:topic-list-item", {
    showTopicModal(topic_detail) {
      const topicDetail = topic_detail.post_stream.posts[0] || {};
      const liked = topic_detail.liked ? "liked" : "";
      const commentsList = topicDetail.comments ? (topicDetail.comments.reverse() || []) : [];
      
      commentsList.map(cm => {
        if(!cm.name || cm.name.trim() == "") cm.name = cm.username;
        return cm;
      })

      const limitComment = 1;
      const countComment = commentsList.length;
      let lastComments = [];
      let hideComments = [];
      if (commentsList.length <= limitComment) {
        lastComments = commentsList;
      } else {
        lastComments = commentsList.slice(countComment - limitComment);
        hideComments = commentsList.slice(0, countComment - limitComment);
      }

      let modalTopic = showModal("topic-detail-selector");
      modalTopic.setProperties({
        topicDetail: topicDetail,
        lastComments: commentsList,
        hideComments: hideComments,
        countComment: topic_detail.comment_count,
        topic: this.topic,
        user: this.currentUser,
        liked: liked,
        post: this.post,
        topic_detail: topic_detail,
        more_comment: topic_detail.comment_count <= 3 ? false : true
      });
      
    },

    getTopic(topic) {
      $('#loading').show();
      
      return ajax(this.topic.url, {
        dataType: "json",
        type: "GET"
      });
    },

    click(e) {
      this.getTopic()
      .then(
        (topic_detail) => {
          this.showTopicModal(topic_detail);
          
          $('#loading').hide();
        }
      ).catch(
        (error) => {
          popupAjaxError(error);
          $('#loading').hide();
        }
      )
    }
  });

  api.modifyClass("model:composer", {
    pluginId: "topic-detail-modal",

    vt_save(opts) {
      return this.beforeSave().then(() => {
        return this.vt_createPost(opts)
      });
    },

    vt_createPost(opts) {
      if (CREATE_TOPIC === this.action || PRIVATE_MESSAGE === this.action) {
        this.set("topic", null);
      }

      const post = this.post;
      const topic = this.topic;
      const user = this.user;
      const postStream = this.get("topic.postStream");
      let addedToStream = false;
      const postTypes = this.site.post_types;
      const postType = this.whisper ? postTypes.whisper : postTypes.regular;

      // Build the post object
      const createdPost = this.store.createRecord("post", {
        imageSizes: opts.imageSizes,
        cooked: this.getCookedHtml(),
        reply_count: 0,
        name: user.name,
        display_username: user.name,
        username: user.username,
        user_id: user.id,
        user_title: user.title,
        avatar_template: user.avatar_template,
        user_custom_fields: user.custom_fields,
        post_type: postType,
        actions_summary: [],
        moderator: user.moderator,
        admin: user.admin,
        yours: true,
        read: true,
        wiki: false,
        typingTime: this.typingTime,
        composerTime: this.composerTime,
      });

      this.serialize(_create_serializer, createdPost);
      createdPost.raw = opts.raw
      createdPost.category = opts.category
      createdPost.topic_id = opts.topic_id

      if (post) {
        createdPost.setProperties({
          reply_to_post_number: post.post_number,
          reply_to_user: post.getProperties("username", "avatar_template"),
        });
      }

      let state = null;

      // If we're in a topic, we can append the post instantly.
      if (postStream) {
        // If it's in reply to another post, increase the reply count
        if (post) {
          post.setProperties({
            reply_count: (post.reply_count || 0) + 1,
            replies: [],
          });
        }

        // We do not stage posts in mobile view, we do not have the "cooked"
        // Furthermore calculating cooked is very complicated, especially since
        // we would need to handle oneboxes and other bits that are not even in the
        // engine, staging will just cause a blank post to render
        if (!isEmpty(createdPost.cooked)) {
          state = postStream.stagePost(createdPost, user);
          if (state === "alreadyStaging") {
            return;
          }
        }
      }

      const composer = this;
      composer.setProperties({
        composeState: SAVING,
        stagedPost: state === "staged" && createdPost,
      });
      return createdPost.save()
    },

  })

  // let site_header_admin = this.user.admin

  api.modifyClass('component:site-header', {
    classNames: ['d-header-wrap'],

    init() {
      this._super(...arguments);
      const currentUser = this.get("currentUser");
      if(currentUser && currentUser.admin) {
        this.elementId = 'vt-d-header-wrap-admin';
      } else {
        this.elementId = 'vt-d-header-wrap-user';
      }
    },

  });

  api.modifyClass("component:item", {
    click(e) {
      alert("Click")
    }
  });
};




export default {
  name: "apply-click-topic",
  initialize() {
    withPluginApi("0.8.7", initializeClickTopic);
  }
};
