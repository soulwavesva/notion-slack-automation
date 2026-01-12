const { WebClient } = require('@slack/web-api');

class SlackService {
  constructor() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
    this.channelId = process.env.SLACK_CHANNEL_ID;
  }

  /**
   * Post a task to Slack with a "Done" button
   */
  async postTaskMessage(task) {
    try {
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
      const today = new Date().toISOString().split('T')[0];
      
      // Determine emoji and text based on priority and due date
      let dueDateText = `📅 Due: ${dueDate}`;
      let taskEmoji = '📌'; // Pin emoji for all tasks
      
      if (task.priority === 'upcoming') {
        // Green emoji for upcoming tasks (next few days)
        dueDateText = `🟢 *upcoming*: ${dueDate}`;
      } else if (task.dueDate) {
        // Red/orange emojis for urgent tasks
        if (task.dueDate < today) {
          dueDateText = `🔴 *overdue*: ${dueDate}`;
        } else if (task.dueDate === today) {
          dueDateText = `🟡 *due today*: ${dueDate}`;
        }
      }
      
      const result = await this.client.chat.postMessage({
        channel: this.channelId,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${taskEmoji} *${task.title}*\n${dueDateText}`
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

      console.log(`Posted ${task.priority || 'urgent'} task "${task.title}" to Slack`);
      
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

  /**
   * Delete a message from Slack (or update it if delete fails)
   */
  async deleteMessage(channel, messageTs) {
    try {
      // Try to delete the message
      await this.client.chat.delete({
        channel: channel,
        ts: messageTs
      });
      
      console.log(`Deleted message ${messageTs} from Slack`);
      
    } catch (error) {
      console.log('Could not delete message, updating instead...');
      
      // If delete fails, update the message to show it's completed
      try {
        await this.client.chat.update({
          channel: channel,
          ts: messageTs,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '✅ *Task Completed!* This task has been marked as done in Notion.'
              }
            }
          ]
        });
        
        console.log(`Updated message ${messageTs} to show completion`);
        
      } catch (updateError) {
        console.error('Error updating Slack message:', updateError);
        throw updateError;
      }
    }
  }

  /**
   * Post a summary message
   */
  async postSummaryMessage(message) {
    try {
      await this.client.chat.postMessage({
        channel: this.channelId,
        text: message,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message
            }
          }
        ]
      });
      
    } catch (error) {
      console.error('Error posting summary message:', error);
      throw error;
    }
  }
}

module.exports = { SlackService };