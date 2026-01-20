const { WebClient } = require('@slack/web-api');

class SlackService {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.channelId = process.env.SLACK_CHANNEL_ID;
  }

  async postTaskMessage(task) {
    try {
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
      const today = new Date().toISOString().split('T')[0];
      
      let dueDateText = `📅 Due: ${dueDate}`;
      let taskEmoji = '📌';
      
      if (task.priority === 'upcoming') {
        dueDateText = `🟢 *upcoming*: ${dueDate}`;
      } else if (task.dueDate) {
        if (task.dueDate < today) {
          dueDateText = `🔴 *overdue*: ${dueDate}`;
        } else if (task.dueDate === today) {
          dueDateText = `🟡 *due today*: ${dueDate}`;
        }
      }
      
      const assignedText = task.assignedTo ? `${task.assignedTo.emoji} *${task.assignedTo.name}*` : '';
      
      const result = await this.client.chat.postMessage({
        channel: this.channelId,
        text: `${task.assignedTo?.name || 'UNASSIGNED'}: ${task.title} - ${dueDate}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${assignedText} ${taskEmoji} *${task.title}*\n${dueDateText}`
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ Done'
              },
              style: task.priority === 'upcoming' ? undefined : 'primary',
              action_id: 'mark_done',
              value: task.id
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `<${task.url}|View in Notion>`
              }
            ]
          }
        ]
      });

      console.log(`Posted ${task.priority || 'urgent'} task "${task.title}" for ${task.assignedTo?.name || 'UNASSIGNED'} to Slack`);
      
      return {
        messageTs: result.ts,
        channel: result.channel,
        taskId: task.id
      };
      
    } catch (error) {
      console.error('Error posting task to Slack:', error);
      throw error;
    }
  }
}

module.exports = { SlackService };