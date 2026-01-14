const { Client } = require('@notionhq/client');

class NotionService {
  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    this.databaseId = process.env.NOTION_DATABASE_ID;
  }

  /**
   * Get overdue and today's tasks from Notion database
   * Returns tasks where checkbox is false and due date is today or earlier
   * Sorted by most overdue first (oldest due date first)
   */
  async getOverdueTasks() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // First, get database structure to find property names
      const database = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      
      // Find checkbox and date properties automatically
      let checkboxProperty = null;
      let dateProperty = null;
      
      Object.entries(database.properties).forEach(([name, property]) => {
        if (property.type === 'checkbox' && !checkboxProperty) {
          checkboxProperty = name;
        }
        if (property.type === 'date' && name.toLowerCase().includes('due')) {
          dateProperty = name;
        }
      });
      
      console.log(`Found checkbox property: "${checkboxProperty}"`);
      console.log(`Found date property: "${dateProperty}"`);
      
      if (!checkboxProperty || !dateProperty) {
        throw new Error(`Missing properties - Checkbox: ${checkboxProperty}, Date: ${dateProperty}`);
      }
      
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          and: [
            {
              property: checkboxProperty, // Auto-detected checkbox property
              checkbox: {
                equals: false
              }
            },
            {
              property: dateProperty, // Auto-detected date property
              date: {
                on_or_before: today // Include today AND overdue tasks
              }
            }
          ]
        },
        sorts: [
          {
            property: dateProperty,
            direction: 'ascending' // Most overdue first (oldest dates first)
          }
        ]
      });

      return response.results.map(page => ({
        id: page.id,
        title: this.extractTitle(page),
        dueDate: this.extractDueDate(page),
        url: page.url,
        priority: 'urgent', // Mark as urgent (red/orange emojis)
        assignedTo: this.extractAssignedPerson(page)
      }));
      
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      throw error;
    }
  }

  /**
   * Get upcoming tasks (next 7 days) from Notion database
   * Returns tasks where checkbox is false and due date is in the next 7 days
   * Sorted by due date ascending
   */
  async getUpcomingTasks() {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);
      
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];
      
      // Get database structure to find property names
      const database = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      
      // Find checkbox and date properties automatically
      let checkboxProperty = null;
      let dateProperty = null;
      
      Object.entries(database.properties).forEach(([name, property]) => {
        if (property.type === 'checkbox' && !checkboxProperty) {
          checkboxProperty = name;
        }
        if (property.type === 'date' && name.toLowerCase().includes('due')) {
          dateProperty = name;
        }
      });
      
      if (!checkboxProperty || !dateProperty) {
        throw new Error(`Missing properties - Checkbox: ${checkboxProperty}, Date: ${dateProperty}`);
      }
      
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          and: [
            {
              property: checkboxProperty,
              checkbox: {
                equals: false
              }
            },
            {
              property: dateProperty,
              date: {
                on_or_after: tomorrowStr // Tomorrow or later
              }
            },
            {
              property: dateProperty,
              date: {
                on_or_before: sevenDaysStr // Within next 7 days
              }
            }
          ]
        },
        sorts: [
          {
            property: dateProperty,
            direction: 'ascending' // Earliest upcoming first
          }
        ]
      });

      return response.results.map(page => ({
        id: page.id,
        title: this.extractTitle(page),
        dueDate: this.extractDueDate(page),
        url: page.url,
        priority: 'upcoming', // Mark as upcoming (green emoji)
        assignedTo: this.extractAssignedPerson(page)
      }));
      
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      throw error;
    }
  }

  /**
   * Mark a task as complete by checking the checkbox in Notion
   */
  async markTaskComplete(taskId) {
    try {
      // Get database structure to find checkbox property name
      const database = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });
      
      let checkboxProperty = null;
      Object.entries(database.properties).forEach(([name, property]) => {
        if (property.type === 'checkbox' && !checkboxProperty) {
          checkboxProperty = name;
        }
      });
      
      if (!checkboxProperty) {
        throw new Error('No checkbox property found in database');
      }
      
      const updateData = {};
      updateData[checkboxProperty] = {
        checkbox: true // Check the checkbox to mark task as complete
      };
      
      await this.notion.pages.update({
        page_id: taskId,
        properties: updateData
      });
      
      console.log(`Task ${taskId} checkbox "${checkboxProperty}" marked as CHECKED in Notion`);
      
    } catch (error) {
      console.error('Error checking task checkbox:', error);
      throw error;
    }
  }

  /**
   * Get ALL tasks from Notion database (for tracking new additions)
   */
  async getAllTasks() {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        page_size: 100 // Get more tasks to track
      });

      return response.results.map(page => ({
        id: page.id,
        title: this.extractTitle(page),
        dueDate: this.extractDueDate(page),
        completed: this.extractCheckboxStatus(page),
        url: page.url,
        createdTime: page.created_time,
        assignedTo: this.extractAssignedPerson(page)
      }));
      
    } catch (error) {
      console.error('Error fetching all tasks:', error);
      throw error;
    }
  }

  /**
   * Get a specific task by ID
   */
  async getTaskById(taskId) {
    try {
      const page = await this.notion.pages.retrieve({
        page_id: taskId
      });
      
      return {
        id: page.id,
        title: this.extractTitle(page),
        dueDate: this.extractDueDate(page),
        completed: this.extractCheckboxStatus(page),
        url: page.url,
        createdTime: page.created_time,
        assignedTo: this.extractAssignedPerson(page)
      };
      
    } catch (error) {
      if (error.code === 'object_not_found') {
        // Task was deleted
        return null;
      }
      console.error(`Error fetching task ${taskId}:`, error);
      throw error;
    }
  }
  async isTaskCompleted(taskId) {
    try {
      const page = await this.notion.pages.retrieve({
        page_id: taskId
      });
      
      return this.extractCheckboxStatus(page);
      
    } catch (error) {
      console.error(`Error checking if task ${taskId} is completed:`, error);
      // If we can't check the task (maybe it was deleted), assume it's completed
      return true;
    }
  }
  extractCheckboxStatus(page) {
    // Find the checkbox property
    const checkboxProperty = Object.values(page.properties).find(
      prop => prop.type === 'checkbox'
    );
    
    return checkboxProperty ? checkboxProperty.checkbox : false;
  }
  extractTitle(page) {
    // Look for title property (usually the first property or named 'Name'/'Title')
    const titleProperty = Object.values(page.properties).find(
      prop => prop.type === 'title'
    );
    
    if (titleProperty && titleProperty.title.length > 0) {
      return titleProperty.title[0].plain_text;
    }
    
    return 'Untitled Task';
  }

  /**
   * Extract due date from Notion page properties
   */
  extractDueDate(page) {
    const dueDateProperty = page.properties['Due Date'];
    
    if (dueDateProperty && dueDateProperty.date) {
      return dueDateProperty.date.start;
    }
    
    return null;
  }

  /**
   * Extract assigned person from Notion page properties
   * Maps Notion names to short names with emojis
   */
  extractAssignedPerson(page) {
    // Look for "Assigned To" property (note: capital T)
    const assignedProperty = page.properties['Assigned To'] || page.properties['Assigned to'] || page.properties['Person'] || page.properties['Assign'];
    
    if (assignedProperty && assignedProperty.people && assignedProperty.people.length > 0) {
      const personName = assignedProperty.people[0].name;
      
      // Map Notion names to short names with emojis
      // Be more specific with matching to avoid conflicts
      if (personName === 'Robert Schok' || (personName.includes('Robert') && personName.includes('Schok'))) {
        return { name: 'ROB', emoji: '👨‍💼', fullName: 'Robert Schok' };
      } else if (personName === 'Samuel Robertson' || (personName.includes('Samuel') && personName.includes('Robertson'))) {
        return { name: 'SAM', emoji: '👨‍💻', fullName: 'Samuel Robertson' };
      } else if (personName === 'Anna Schuster' || (personName.includes('Anna') && personName.includes('Schuster'))) {
        return { name: 'ANNA', emoji: '👩‍💼', fullName: 'Anna Schuster' };
      }
      
      // Default if name doesn't match
      return { name: personName.split(' ')[0].toUpperCase(), emoji: '👤', fullName: personName };
    }
    
    return { name: 'UNASSIGNED', emoji: '❓', fullName: 'Unassigned' };
  }
}

module.exports = { NotionService };